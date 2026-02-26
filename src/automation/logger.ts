import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'data', 'logs');

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile(): string {
  const date = new Date().toISOString().slice(0, 10);
  return join(LOG_DIR, `pipeline-${date}.log`);
}

function timestamp(): string {
  return new Date().toISOString();
}

export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown) {
  ensureLogDir();
  const line = `[${timestamp()}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
  appendFileSync(getLogFile(), line);
  if (level === 'ERROR') {
    console.error(`[${level}] ${message}`);
  } else {
    console.log(`[${level}] ${message}`);
  }
}

export function logInfo(message: string, data?: unknown) {
  log('INFO', message, data);
}

export function logWarn(message: string, data?: unknown) {
  log('WARN', message, data);
}

export function logError(message: string, data?: unknown) {
  log('ERROR', message, data);
}

export function writeRunReport(report: {
  date: string;
  eventsScraped: number;
  eventsScheduled: number;
  videosGenerated: number;
  videosPublished: number;
  errors: string[];
}) {
  ensureLogDir();
  const file = join(LOG_DIR, `report-${report.date}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2));
  logInfo(`Run report written to ${file}`);
}
