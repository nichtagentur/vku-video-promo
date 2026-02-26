import { ScrapedEvent } from '../types';
import { hasBeenPosted, PostRecord } from './state';
import { logInfo, logWarn } from './logger';

export type Phase = PostRecord['phase'];

export interface ScheduledPost {
  event: ScrapedEvent;
  phase: Phase;
  format: '9:16' | '4:5';
  style: string;
  daysUntilEvent: number;
}

/**
 * Parse German date string like "24.03.2026" or "24. Maerz 2026" into a Date.
 * Also handles ranges like "24. - 25.03.2026".
 */
function parseGermanDate(dateStr: string): Date | null {
  // Try DD.MM.YYYY format
  const numericMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try "DD. Month YYYY" format
  const months: Record<string, number> = {
    'januar': 0, 'februar': 1, 'maerz': 2, 'märz': 2, 'april': 3,
    'mai': 4, 'juni': 5, 'juli': 6, 'august': 7, 'september': 8,
    'oktober': 9, 'november': 10, 'dezember': 11,
  };
  const textMatch = dateStr.toLowerCase().match(/(\d{1,2})\.\s*(\w+)\s+(\d{4})/);
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const monthNum = months[monthName];
    if (monthNum !== undefined) {
      return new Date(parseInt(year), monthNum, parseInt(day));
    }
  }

  return null;
}

function getDaysUntil(eventDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isOptimalPostingDay(): boolean {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Preferred: Tue(2), Wed(3), Thu(4)
  // Avoid: Sat(6), Sun(0), Mon(1)
  // Friday is OK but suboptimal
  return day >= 2 && day <= 4;
}

function isFridayAfternoon(): boolean {
  const now = new Date();
  return now.getDay() === 5 && now.getHours() >= 14;
}

/**
 * Determine which phase an event should be posted in based on countdown.
 */
function determinePhase(daysUntil: number): Phase | null {
  if (daysUntil >= 28 && daysUntil <= 42) return 'awareness';    // 4-6 weeks
  if (daysUntil >= 14 && daysUntil <= 21) return 'reminder';      // 2-3 weeks
  if (daysUntil >= 5 && daysUntil <= 7) return 'urgency';         // 5-7 days
  // No last-call phase: only create videos for events at least 5 days away
  return null;
}

function getPhaseConfig(phase: Phase): { format: '9:16' | '4:5'; style: string } {
  switch (phase) {
    case 'awareness':
      return { format: '9:16', style: 'Informational, topic teaser' };
    case 'reminder':
      return { format: '4:5', style: 'Benefits, speaker highlight' };
    case 'urgency':
      return { format: '9:16', style: 'Nur noch X Plaetze - urgency' };
    case 'last-call':
      return { format: '4:5', style: 'Final CTA - last chance to register' };
  }
}

/**
 * Given a list of scraped events, determine which need posts today.
 */
export function scheduleEvents(events: ScrapedEvent[]): ScheduledPost[] {
  const scheduled: ScheduledPost[] = [];
  const isOptimalDay = isOptimalPostingDay();
  const isFriPM = isFridayAfternoon();

  logInfo(`Scheduling check: ${events.length} events, optimal day: ${isOptimalDay}, Friday PM: ${isFriPM}`);

  for (const event of events) {
    const eventDate = parseGermanDate(event.date);
    if (!eventDate) {
      logWarn(`Could not parse date for event: ${event.title} (date: ${event.date})`);
      continue;
    }

    const daysUntil = getDaysUntil(eventDate);
    if (daysUntil < 0) {
      continue; // Event already passed
    }

    const phase = determinePhase(daysUntil);
    if (!phase) {
      continue; // Not in any posting window
    }

    // Check deduplication
    if (hasBeenPosted(event.id, phase)) {
      logInfo(`Already posted: ${event.id} / ${phase}`);
      continue;
    }

    // Urgency posts can go on Fridays too
    // Awareness and reminder prefer optimal days
    if (phase === 'awareness' || phase === 'reminder') {
      if (!isOptimalDay) {
        logInfo(`Skipping ${event.id} / ${phase} - not an optimal posting day`);
        continue;
      }
    }

    if (isFriPM) {
      logInfo(`Skipping ${event.id} / ${phase} - Friday afternoon`);
      continue;
    }

    const config = getPhaseConfig(phase);
    scheduled.push({
      event,
      phase,
      format: config.format,
      style: config.style,
      daysUntilEvent: daysUntil,
    });

    logInfo(`Scheduled: ${event.title} -> ${phase} (${daysUntil} days until event)`);
  }

  return scheduled;
}
