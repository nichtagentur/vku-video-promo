'use client';

export class VideoRecorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  startRecording(fps = 30): Promise<void> {
    return new Promise((resolve) => {
      const stream = this.canvas.captureStream(fps);
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5_000_000,
      });
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.onstart = () => resolve();
      this.mediaRecorder.start(100); // collect data every 100ms
    });
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async convertToMp4(webmBlob: Blob): Promise<Blob> {
    // Dynamic import of ffmpeg.wasm
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();
    await ffmpeg.load();

    const inputData = await fetchFile(webmBlob);
    await ffmpeg.writeFile('input.webm', inputData);
    await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', 'output.mp4']);
    const data = await ffmpeg.readFile('output.mp4');

    return new Blob([data as BlobPart], { type: 'video/mp4' });
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
