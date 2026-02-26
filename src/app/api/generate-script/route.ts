import { NextRequest, NextResponse } from 'next/server';
import { generateVideoScript } from '@/lib/claude';
import { ScrapedEvent } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { event } = (await req.json()) as { event: ScrapedEvent };

    if (!event?.title) {
      return NextResponse.json({ error: 'Event data required' }, { status: 400 });
    }

    const scenes = await generateVideoScript(event);
    return NextResponse.json({ scenes });
  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate script', details: String(error) },
      { status: 500 }
    );
  }
}
