import * as cheerio from 'cheerio';
import { ScrapedEvent } from '@/types';

const BASE_URL = 'https://www.kommunaldigital.de';

export async function scrapeEvents(): Promise<ScrapedEvent[]> {
  const res = await fetch(`${BASE_URL}/vku-akademie`, {
    next: { revalidate: 3600 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; VKU-Promo-Generator/1.0)',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }

  const html = await res.text();
  return parseEventsFromHTML(html);
}

export function parseEventsFromHTML(html: string): ScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  // kommunaldigital.de uses article.event-teaser elements within .views-row
  $('article.event-teaser').each((i, el) => {
    const $el = $(el);

    // Title from .card-item--title h2 a span
    const title = $el.find('.card-item--title h2 span.field--name-title').text().trim();
    if (!title || title.length < 3) return;

    // Link
    const href = $el.find('.card-item--title h2 a').attr('href') || '';
    if (!href) return;

    // Date from .field--name-field-event-date
    const dateText = $el.find('.field--name-field-event-date').text().trim();

    // Teaser/description from .field--name-field-event-teaser p
    const desc = $el.find('.field--name-field-event-teaser p').text().trim();

    // Image - get the last (largest) img src
    const img = $el.find('.card-item--image img').attr('src');

    // Event type from URL path
    let eventType = 'Web-Seminar';
    if (href.includes('/live-event/')) {
      eventType = 'Infotag';
    } else if (href.includes('/online-event/')) {
      eventType = 'Web-Seminar';
    }

    // Generate a clean ID from the href
    const id = href.replace(/^\//, '').replace(/\//g, '-') || `event-${i}`;

    events.push({
      id,
      title,
      date: dateText || 'Termin wird bekannt gegeben',
      type: eventType,
      description: desc || title,
      image: img ? (img.startsWith('http') ? img : `${BASE_URL}${img}`) : undefined,
      url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
    });
  });

  return events;
}

export async function scrapeEventDetails(url: string): Promise<Partial<ScrapedEvent>> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; VKU-Promo-Generator/1.0)',
    },
  });

  if (!res.ok) return {};

  const html = await res.text();
  const $ = cheerio.load(html);

  const description = $('meta[name="description"]').attr('content')
    || $('.field--name-field-event-teaser p').first().text().trim()
    || '';

  const speaker = $('[class*="speaker"], [class*="referent"], [class*="dozent"]')
    .first().text().trim();

  return {
    description: description.slice(0, 500),
    speaker: speaker || undefined,
  };
}
