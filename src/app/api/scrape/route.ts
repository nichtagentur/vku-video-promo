import { NextResponse } from 'next/server';
import { scrapeEvents } from '@/lib/scraper';

export async function GET() {
  try {
    const events = await scrapeEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape events', details: String(error) },
      { status: 500 }
    );
  }
}
