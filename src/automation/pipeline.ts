import { scrapeEvents } from '../lib/scraper';
import { generateVideoScript } from '../lib/claude';
import { scheduleEvents, ScheduledPost, Phase } from './scheduler';
import { factCheck } from './fact-checker';
import { generateCaption } from './caption';
import { renderVideo } from './headless-render';
import { publishToInstagram, isInstagramConfigured } from './instagram';
import { recordPost } from './state';
import { logInfo, logError, logWarn, writeRunReport } from './logger';
import { ScrapedEvent, Scene, VideoFormat } from '../types';

export interface PipelineOptions {
  dryRun?: boolean;
  postOne?: boolean;
  skipRender?: boolean;
  skipFactCheck?: boolean;
  eventId?: string; // Process only a specific event
}

interface PipelineResult {
  eventsScraped: number;
  eventsScheduled: number;
  videosGenerated: number;
  videosPublished: number;
  errors: string[];
  posts: Array<{
    event: string;
    phase: Phase;
    videoFile?: string;
    factCheckPassed?: boolean;
    published: boolean;
    instagramPostId?: string;
  }>;
}

/**
 * Generate a phase-specific video script.
 * Enhances the base script generation with phase-specific styling.
 */
async function generatePhaseScript(
  event: ScrapedEvent,
  phase: Phase,
  style: string,
  daysUntil: number,
): Promise<Scene[]> {
  // Enrich event description with phase context for Claude
  const enrichedEvent: ScrapedEvent = {
    ...event,
    description: `${event.description}\n\n[PHASE: ${phase}] [STYLE: ${style}] [TAGE BIS ZUM EVENT: ${daysUntil}]`,
  };

  return generateVideoScript(enrichedEvent);
}

/**
 * Main pipeline orchestrator.
 */
export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  const { dryRun = false, postOne = false, skipRender = false, skipFactCheck = false, eventId } = options;
  const date = new Date().toISOString().slice(0, 10);

  logInfo(`=== Pipeline started: ${date} ===`);
  logInfo(`Options: dryRun=${dryRun}, postOne=${postOne}, skipRender=${skipRender}`);

  if (!isInstagramConfigured() && !dryRun) {
    logWarn('Instagram not configured -- forcing dry-run mode');
  }
  const effectiveDryRun = dryRun || !isInstagramConfigured();

  const result: PipelineResult = {
    eventsScraped: 0,
    eventsScheduled: 0,
    videosGenerated: 0,
    videosPublished: 0,
    errors: [],
    posts: [],
  };

  try {
    // Step 1: Scrape events
    logInfo('Step 1: Scraping events...');
    const events = await scrapeEvents();
    result.eventsScraped = events.length;
    logInfo(`Found ${events.length} events`);

    if (events.length === 0) {
      logWarn('No events found, exiting');
      return result;
    }

    // Step 2: Schedule
    logInfo('Step 2: Scheduling...');
    let scheduled: ScheduledPost[];

    if (eventId) {
      // Process a specific event -- find it and create a mock schedule
      const event = events.find(e => e.id === eventId || e.id.includes(eventId));
      if (!event) {
        logError(`Event not found: ${eventId}`);
        result.errors.push(`Event not found: ${eventId}`);
        return result;
      }
      scheduled = [{
        event,
        phase: 'awareness' as Phase,
        format: '9:16' as const,
        style: 'Informational, topic teaser',
        daysUntilEvent: 30,
      }];
    } else {
      scheduled = scheduleEvents(events);
    }

    result.eventsScheduled = scheduled.length;
    logInfo(`${scheduled.length} events scheduled for posting`);

    if (scheduled.length === 0) {
      logInfo('No events need posting today');
      return result;
    }

    // Step 3: Process each scheduled post
    const toProcess = postOne ? [scheduled[0]] : scheduled;

    for (const post of toProcess) {
      const postResult = {
        event: post.event.title,
        phase: post.phase,
        videoFile: undefined as string | undefined,
        factCheckPassed: undefined as boolean | undefined,
        published: false,
        instagramPostId: undefined as string | undefined,
      };

      try {
        logInfo(`\n--- Processing: ${post.event.title} (${post.phase}) ---`);

        // 3a: Generate script
        logInfo('Generating video script...');
        const scenes = await generatePhaseScript(
          post.event, post.phase, post.style, post.daysUntilEvent,
        );
        logInfo(`Generated ${scenes.length} scenes`);

        // 3b: Fact-check
        if (!skipFactCheck) {
          logInfo('Running fact-check...');
          const factResult = await factCheck(post.event, scenes);
          postResult.factCheckPassed = factResult.passed;

          if (!factResult.passed) {
            logError(`BLOCKED: Fact-check failed for ${post.event.title}`, factResult.discrepancies);
            result.errors.push(`Fact-check failed: ${post.event.title} - ${factResult.discrepancies.join(', ')}`);
            result.posts.push(postResult);
            continue; // Skip this event -- hard gate
          }
        }

        // 3c: Generate caption
        logInfo('Generating caption...');
        const captionResult = await generateCaption(post.event, post.phase, post.daysUntilEvent);

        // 3d: Render video
        let videoFile: string | undefined;
        if (!skipRender) {
          logInfo('Rendering video...');
          videoFile = await renderVideo(post.event, scenes, post.format as VideoFormat);
          postResult.videoFile = videoFile;
          result.videosGenerated++;
        } else {
          logInfo('Skipping render (--skip-render)');
        }

        // 3e: Publish
        if (!effectiveDryRun && videoFile) {
          logInfo('Publishing to Instagram...');
          const pubResult = await publishToInstagram(videoFile, captionResult.caption, post.format);
          postResult.published = pubResult.success;
          postResult.instagramPostId = pubResult.postId;

          if (pubResult.success) {
            result.videosPublished++;
          } else {
            result.errors.push(`Publish failed: ${post.event.title} - ${pubResult.error}`);
          }
        } else {
          logInfo(effectiveDryRun ? 'DRY RUN: Skipping publish' : 'No video file, skipping publish');
        }

        // Record in state
        recordPost({
          eventId: post.event.id,
          phase: post.phase,
          postedAt: new Date().toISOString(),
          instagramPostId: postResult.instagramPostId,
          videoFile: postResult.videoFile,
          dryRun: effectiveDryRun,
        });

        result.posts.push(postResult);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logError(`Error processing ${post.event.title}: ${msg}`);
        result.errors.push(`${post.event.title}: ${msg}`);
        result.posts.push(postResult);
      }
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Pipeline error: ${msg}`);
    result.errors.push(msg);
  }

  // Write run report
  writeRunReport({
    date,
    eventsScraped: result.eventsScraped,
    eventsScheduled: result.eventsScheduled,
    videosGenerated: result.videosGenerated,
    videosPublished: result.videosPublished,
    errors: result.errors,
  });

  logInfo(`=== Pipeline finished: ${result.videosGenerated} generated, ${result.videosPublished} published, ${result.errors.length} errors ===`);
  return result;
}
