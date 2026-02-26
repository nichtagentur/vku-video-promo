import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateVideoFromImage(imageUrl: string): Promise<string> {
  // Fetch the image and convert to base64
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(`Failed to fetch image: ${imgResponse.status}`);
  }
  const imgBuffer = await imgResponse.arrayBuffer();
  const base64Image = Buffer.from(imgBuffer).toString('base64');
  const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';

  // Generate video from image using Veo
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    image: {
      imageBytes: base64Image,
      mimeType,
    },
    config: {
      aspectRatio: '16:9',
      numberOfVideos: 1,
      durationSeconds: 5,
      personGeneration: 'allow_all',
    },
  });

  // Poll until done (Veo can take 30-90s)
  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({
      operation: operation,
    });
  }

  const generatedVideo = operation.response?.generatedVideos?.[0];
  if (!generatedVideo?.video) {
    throw new Error('No video generated');
  }

  // If video bytes are available directly, use them
  if (generatedVideo.video.videoBytes) {
    return `data:video/mp4;base64,${generatedVideo.video.videoBytes}`;
  }

  // Otherwise download via SDK to a temp file
  const tmpFile = path.join(os.tmpdir(), `veo-${Date.now()}.mp4`);
  try {
    await ai.files.download({
      file: generatedVideo.video,
      downloadPath: tmpFile,
    });
    const videoBuffer = fs.readFileSync(tmpFile);
    const videoBase64 = videoBuffer.toString('base64');
    return `data:video/mp4;base64,${videoBase64}`;
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}
