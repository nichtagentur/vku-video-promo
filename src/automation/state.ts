import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { logInfo } from './logger';

const STATE_FILE = join(process.cwd(), 'data', 'state.json');

export interface PostRecord {
  eventId: string;
  phase: 'awareness' | 'reminder' | 'urgency' | 'last-call';
  postedAt: string;
  instagramPostId?: string;
  videoFile?: string;
  dryRun?: boolean;
}

interface State {
  posts: PostRecord[];
}

function ensureStateFile() {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(STATE_FILE)) {
    writeFileSync(STATE_FILE, JSON.stringify({ posts: [] }, null, 2));
  }
}

export function loadState(): State {
  ensureStateFile();
  const raw = readFileSync(STATE_FILE, 'utf-8');
  return JSON.parse(raw);
}

export function saveState(state: State) {
  ensureStateFile();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function hasBeenPosted(eventId: string, phase: PostRecord['phase']): boolean {
  const state = loadState();
  return state.posts.some(p => p.eventId === eventId && p.phase === phase && !p.dryRun);
}

export function recordPost(record: PostRecord) {
  const state = loadState();
  state.posts.push(record);
  saveState(state);
  logInfo(`Recorded post: ${record.eventId} / ${record.phase}${record.dryRun ? ' (dry run)' : ''}`);
}
