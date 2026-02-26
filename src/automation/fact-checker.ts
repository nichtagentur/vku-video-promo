import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import { ScrapedEvent, Scene } from '../types';
import { logInfo, logError } from './logger';

interface EventFacts {
  title: string;
  date: string;
  time?: string;
  speaker?: string;
  price?: string;
  format?: string;
  description: string;
  rawText: string;
}

interface FactCheckResult {
  passed: boolean;
  discrepancies: string[];
  verifiedFacts: EventFacts;
}

/**
 * Scrape the event's landing page to extract verified facts.
 */
async function scrapeEventFacts(url: string): Promise<EventFacts> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; VKU-Promo-Generator/1.0)',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch event page: ${res.status} ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim()
    || $('meta[property="og:title"]').attr('content')
    || '';

  const date = $('.field--name-field-event-date').text().trim()
    || $('[class*="date"]').first().text().trim()
    || '';

  const time = $('[class*="time"], [class*="uhrzeit"]').first().text().trim() || undefined;

  const speaker = $('[class*="speaker"], [class*="referent"], [class*="dozent"]')
    .first().text().trim() || undefined;

  const price = $('[class*="price"], [class*="preis"], [class*="kosten"]')
    .first().text().trim() || undefined;

  const format = $('[class*="format"], [class*="typ"]')
    .first().text().trim() || undefined;

  const description = $('meta[name="description"]').attr('content')
    || $('.field--name-body').text().trim().slice(0, 1000)
    || '';

  // Get full visible text for comprehensive comparison
  const rawText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 3000);

  return { title, date, time, speaker, price, format, description, rawText };
}

/**
 * Use Claude to compare the video script against verified facts.
 */
async function verifyWithClaude(
  scenes: Scene[],
  facts: EventFacts,
  event: ScrapedEvent,
): Promise<FactCheckResult> {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY_1 });

  const scriptText = scenes
    .map(s => `[${s.id}] "${s.text}"${s.subtext ? ` - "${s.subtext}"` : ''}`)
    .join('\n');

  const prompt = `Du bist ein Faktenpruefer fuer Promo-Videos der VKU Akademie.

Vergleiche das folgende Video-Skript mit den verifizierten Fakten von der Event-Webseite.

## Video-Skript:
${scriptText}

## Verifizierte Fakten von der Webseite:
- Titel: ${facts.title}
- Datum: ${facts.date}
- Uhrzeit: ${facts.time || 'nicht angegeben'}
- Referent: ${facts.speaker || 'nicht angegeben'}
- Preis: ${facts.price || 'nicht angegeben'}
- Format: ${facts.format || event.type}
- Beschreibung: ${facts.description}

## Original Event-Daten:
- Titel: ${event.title}
- Datum: ${event.date}

## Pruefe auf:
1. Stimmt der Titel / das Thema ueberein?
2. Stimmt das Datum (falls im Skript erwaehnt)?
3. Stimmt der Referentenname (falls erwaehnt)?
4. Werden falsche Behauptungen gemacht?
5. Werden nicht existierende Features/Inhalte versprochen?

Antworte NUR als JSON:
{
  "passed": true/false,
  "discrepancies": ["Liste der Unstimmigkeiten, leer wenn passed=true"]
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse fact-check response');
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    passed: result.passed,
    discrepancies: result.discrepancies || [],
    verifiedFacts: facts,
  };
}

/**
 * Full fact-checking pipeline: scrape landing page + Claude verification.
 * Returns pass/fail with specific discrepancies.
 * HARD GATE: Videos with ANY discrepancy are blocked.
 */
export async function factCheck(
  event: ScrapedEvent,
  scenes: Scene[],
): Promise<FactCheckResult> {
  logInfo(`Fact-checking: ${event.title} (${event.url})`);

  try {
    const facts = await scrapeEventFacts(event.url);
    logInfo(`Scraped facts for: ${facts.title}, date: ${facts.date}`);

    const result = await verifyWithClaude(scenes, facts, event);

    if (result.passed) {
      logInfo(`Fact-check PASSED for: ${event.title}`);
    } else {
      logError(`Fact-check FAILED for: ${event.title}`, result.discrepancies);
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Fact-check error for ${event.title}: ${msg}`);
    // Fail closed: if we can't verify, don't publish
    return {
      passed: false,
      discrepancies: [`Fact-check error: ${msg}`],
      verifiedFacts: { title: '', date: '', description: '', rawText: '' },
    };
  }
}
