import puppeteer, { Browser } from 'puppeteer';
import { ScrapedEvent, Scene, VideoFormat, FORMAT_DIMENSIONS } from '../types';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { logInfo, logError } from './logger';

const OUTPUT_DIR = join(process.cwd(), 'data', 'output');
const FRAMES_DIR = join(OUTPUT_DIR, 'frames');
const FPS = 30;

function ensureDirs() {
  for (const dir of [OUTPUT_DIR, FRAMES_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function cleanFrames() {
  try {
    execSync(`rm -f ${FRAMES_DIR}/frame-*.png`, { stdio: 'ignore' });
  } catch { /* ignore */ }
}

async function ensureDevServer(): Promise<string> {
  const baseUrl = 'http://localhost:3000';
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      logInfo('Dev server already running');
      return baseUrl;
    }
  } catch { /* not running */ }

  logInfo('Starting Next.js dev server...');
  const { spawn } = await import('child_process');
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    detached: true,
  });
  proc.unref();

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        logInfo('Dev server started');
        return baseUrl;
      }
    } catch { /* keep waiting */ }
  }
  throw new Error('Dev server failed to start within 60 seconds');
}

/**
 * Render video by capturing canvas frames with Puppeteer screenshots,
 * then stitching them into MP4 with ffmpeg.
 *
 * This approach is reliable in headless Chrome (unlike MediaRecorder).
 */
export async function renderVideo(
  event: ScrapedEvent,
  scenes: Scene[],
  format: VideoFormat,
): Promise<string> {
  ensureDirs();
  cleanFrames();

  const baseUrl = await ensureDevServer();
  const dims = FORMAT_DIMENSIONS[format];
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const totalFrames = Math.ceil(totalDuration * FPS);
  const outputFile = join(OUTPUT_DIR, `${event.id}-${Date.now()}.mp4`);

  logInfo(`Rendering: ${event.title}, ${format} (${dims.width}x${dims.height}), ${totalDuration}s, ${totalFrames} frames`);

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: dims.width + 100, height: dims.height + 200 });

    // Load homepage first to set sessionStorage
    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate((eventJson, scenesJson) => {
      sessionStorage.setItem('currentEvent', eventJson);
      sessionStorage.setItem('currentScenes', scenesJson);
    }, JSON.stringify(event), JSON.stringify(scenes));

    // Navigate to editor
    await page.goto(`${baseUrl}/editor/${event.id}`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.waitForSelector('canvas', { timeout: 15000 });

    // Click the correct format button
    await page.evaluate((fmt: string) => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes(fmt)) {
          btn.click();
          break;
        }
      }
    }, format);
    await new Promise(r => setTimeout(r, 500));

    logInfo('Canvas ready. Capturing frames...');

    // Get canvas element handle for screenshots
    const canvasHandle = await page.$('canvas');
    if (!canvasHandle) throw new Error('Canvas element not found');

    // Capture frames by seeking the engine and extracting canvas data
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / FPS;

      // Seek the canvas engine and extract the full-resolution frame as PNG
      const frameBase64 = await page.evaluate((t: number) => {
        const engineRef = (window as any).__canvasEngine;
        if (engineRef) {
          engineRef.seekTo(t);
        }
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return null;
        // toDataURL returns full resolution regardless of CSS display size
        return canvas.toDataURL('image/png').split(',')[1];
      }, time);

      if (frameBase64) {
        const frameNum = String(frame).padStart(6, '0');
        writeFileSync(
          join(FRAMES_DIR, `frame-${frameNum}.png`),
          Buffer.from(frameBase64, 'base64'),
        );
      }

      // Log progress every 2 seconds of video
      if (frame % (FPS * 2) === 0) {
        logInfo(`  Frame ${frame}/${totalFrames} (${(time).toFixed(1)}s / ${totalDuration.toFixed(1)}s)`);
      }
    }

    logInfo(`All ${totalFrames} frames captured. Running ffmpeg...`);
    await browser.close();
    browser = null;

    // Stitch frames into MP4 with ffmpeg
    const ffmpegCmd = [
      'ffmpeg', '-y',
      '-framerate', String(FPS),
      '-i', `"${join(FRAMES_DIR, 'frame-%06d.png')}"`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-vf', `"scale=trunc(iw/2)*2:trunc(ih/2)*2"`,
      `"${outputFile}"`,
    ].join(' ');

    execSync(ffmpegCmd, { stdio: 'pipe', timeout: 120000 });

    // Check output
    const { statSync } = await import('fs');
    const stats = statSync(outputFile);
    logInfo(`Video rendered: ${outputFile} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

    // Clean up frames
    cleanFrames();

    return outputFile;

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Render failed: ${msg}`);
    cleanFrames();
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}
