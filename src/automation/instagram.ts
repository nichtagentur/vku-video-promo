import { logInfo, logError, logWarn } from './logger';

interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

function getConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  return { accessToken, accountId };
}

export function isInstagramConfigured(): boolean {
  const { accessToken, accountId } = getConfig();
  return !!(accessToken && accountId);
}

/**
 * Upload video to a publicly accessible URL (needed for Meta API).
 * Uses a simple file server or Vercel Blob.
 * For now, returns the local path -- in production, upload to hosting.
 */
async function getPublicVideoUrl(videoPath: string): Promise<string> {
  // TODO: Upload to Vercel Blob or similar when going live
  // For now, log a warning and return the path
  logWarn(`Video at ${videoPath} needs public URL for Instagram upload. Using placeholder.`);
  return `https://example.com/placeholder-video.mp4`;
}

/**
 * Step 1: Create media container on Instagram.
 */
async function createMediaContainer(
  videoUrl: string,
  caption: string,
  mediaType: 'REELS' | 'VIDEO',
): Promise<string> {
  const { accessToken, accountId } = getConfig();

  const params = new URLSearchParams({
    video_url: videoUrl,
    caption,
    media_type: mediaType,
    access_token: accessToken!,
  });

  const res = await fetch(`https://graph.instagram.com/v21.0/${accountId}/media`, {
    method: 'POST',
    body: params,
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Meta API error: ${data.error.message}`);
  }

  logInfo(`Created media container: ${data.id}`);
  return data.id;
}

/**
 * Step 2: Poll until video processing is complete.
 */
async function waitForProcessing(creationId: string, maxWaitMs = 300000): Promise<void> {
  const { accessToken } = getConfig();
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`,
    );
    const data = await res.json();

    if (data.status_code === 'FINISHED') {
      logInfo(`Video processing finished for ${creationId}`);
      return;
    }

    if (data.status_code === 'ERROR') {
      throw new Error(`Video processing failed for ${creationId}`);
    }

    logInfo(`Video processing status: ${data.status_code}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Video processing timed out after ${maxWaitMs / 1000}s`);
}

/**
 * Step 3: Publish the processed media.
 */
async function publishMedia(creationId: string): Promise<string> {
  const { accessToken, accountId } = getConfig();

  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken!,
  });

  const res = await fetch(`https://graph.instagram.com/v21.0/${accountId}/media_publish`, {
    method: 'POST',
    body: params,
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Publish error: ${data.error.message}`);
  }

  logInfo(`Published Instagram post: ${data.id}`);
  return data.id;
}

/**
 * Full Instagram publishing flow: upload -> poll -> publish.
 */
export async function publishToInstagram(
  videoPath: string,
  caption: string,
  format: '9:16' | '4:5',
): Promise<PublishResult> {
  if (!isInstagramConfigured()) {
    logWarn('Instagram not configured (META_ACCESS_TOKEN / INSTAGRAM_ACCOUNT_ID missing)');
    return { success: false, error: 'Instagram not configured -- running in dry-run mode' };
  }

  try {
    const videoUrl = await getPublicVideoUrl(videoPath);
    const mediaType = format === '9:16' ? 'REELS' : 'VIDEO';

    logInfo(`Publishing to Instagram: ${mediaType}, caption length: ${caption.length}`);

    const creationId = await createMediaContainer(videoUrl, caption, mediaType);
    await waitForProcessing(creationId);
    const postId = await publishMedia(creationId);

    return { success: true, postId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Instagram publish failed: ${msg}`);
    return { success: false, error: msg };
  }
}
