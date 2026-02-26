import { NextRequest, NextResponse } from 'next/server';
import { generateVideoFromImage } from '@/lib/veo';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
    }

    const videoUrl = await generateVideoFromImage(imageUrl);
    return NextResponse.json({ videoUrl });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate video', details: String(error) },
      { status: 500 }
    );
  }
}
