#!/usr/bin/env npx tsx

/**
 * VKU Akademie Instagram Automation Pipeline - CLI Entry Point
 *
 * Usage:
 *   npx tsx scripts/run-pipeline.ts [options]
 *
 * Options:
 *   --dry-run        Run without publishing to Instagram
 *   --post-one       Process and publish only the first scheduled event
 *   --skip-render    Skip video rendering (test scheduling + fact-check only)
 *   --skip-fact-check  Skip fact-checking step
 *   --event <id>     Process only a specific event by ID (partial match)
 *   --list-events    Just list scraped events and exit
 *   --list-schedule  Show what would be scheduled today and exit
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });
// Also load from ~/.env for API keys
config({ path: resolve(process.env.HOME || '~', '.env') });

import { runPipeline } from '../src/automation/pipeline';
import { scrapeEvents } from '../src/lib/scraper';
import { scheduleEvents } from '../src/automation/scheduler';
import { loadState } from '../src/automation/state';

const args = process.argv.slice(2);

function hasFlag(flag: string): boolean {
  return args.includes(`--${flag}`);
}

function getFlagValue(flag: string): string | undefined {
  const idx = args.indexOf(`--${flag}`);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

async function main() {
  console.log('VKU Akademie Instagram Automation Pipeline');
  console.log('==========================================\n');

  // List events mode
  if (hasFlag('list-events')) {
    console.log('Scraping events...');
    const events = await scrapeEvents();
    console.log(`\nFound ${events.length} events:\n`);
    for (const e of events) {
      console.log(`  [${e.id}]`);
      console.log(`    Title: ${e.title}`);
      console.log(`    Date:  ${e.date}`);
      console.log(`    Type:  ${e.type}`);
      console.log(`    URL:   ${e.url}`);
      console.log();
    }
    return;
  }

  // List schedule mode
  if (hasFlag('list-schedule')) {
    console.log('Scraping events...');
    const events = await scrapeEvents();
    console.log(`Found ${events.length} events\n`);

    console.log('Checking schedule...');
    const scheduled = scheduleEvents(events);
    console.log(`\n${scheduled.length} events scheduled for today:\n`);
    for (const s of scheduled) {
      console.log(`  [${s.event.id}]`);
      console.log(`    Title:   ${s.event.title}`);
      console.log(`    Phase:   ${s.phase}`);
      console.log(`    Format:  ${s.format}`);
      console.log(`    Style:   ${s.style}`);
      console.log(`    Days:    ${s.daysUntilEvent} until event`);
      console.log();
    }

    const state = loadState();
    console.log(`State: ${state.posts.length} posts recorded`);
    return;
  }

  // Run pipeline
  const options = {
    dryRun: hasFlag('dry-run'),
    postOne: hasFlag('post-one'),
    skipRender: hasFlag('skip-render'),
    skipFactCheck: hasFlag('skip-fact-check'),
    eventId: getFlagValue('event'),
  };

  console.log('Options:', JSON.stringify(options, null, 2), '\n');

  const result = await runPipeline(options);

  console.log('\n==========================================');
  console.log('Pipeline Results:');
  console.log(`  Events scraped:    ${result.eventsScraped}`);
  console.log(`  Events scheduled:  ${result.eventsScheduled}`);
  console.log(`  Videos generated:  ${result.videosGenerated}`);
  console.log(`  Videos published:  ${result.videosPublished}`);

  if (result.errors.length > 0) {
    console.log(`  Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`    - ${err}`);
    }
  }

  if (result.posts.length > 0) {
    console.log('\n  Posts:');
    for (const p of result.posts) {
      console.log(`    - ${p.event} [${p.phase}]`);
      if (p.videoFile) console.log(`      Video: ${p.videoFile}`);
      if (p.factCheckPassed !== undefined) console.log(`      Fact-check: ${p.factCheckPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`      Published: ${p.published}${p.instagramPostId ? ` (${p.instagramPostId})` : ''}`);
    }
  }

  console.log('\nDone.');
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
