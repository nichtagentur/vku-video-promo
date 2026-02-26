import { NextRequest, NextResponse } from 'next/server';
import { generateSceneBackground } from '@/lib/openai-image';

export async function POST(req: NextRequest) {
  try {
    const { sceneText, eventTitle } = await req.json();

    if (!sceneText || !eventTitle) {
      return NextResponse.json({ error: 'sceneText and eventTitle required' }, { status: 400 });
    }

    const imageUrl = await generateSceneBackground(sceneText, eventTitle);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', details: String(error) },
      { status: 500 }
    );
  }
}
