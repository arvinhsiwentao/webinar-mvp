import fs from 'fs';
import path from 'path';
import type { SubtitleGenerationLogEvent } from './types';

export interface SubtitleLogRecord extends SubtitleGenerationLogEvent {
  id: string;
  runId: string;
  createdAt: string;
  webinarId?: string;
}

interface ReadSubtitleLogsOptions {
  limit?: number;
  runId?: string;
  webinarId?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOG_FILE = path.join(DATA_DIR, 'subtitle-generation.ndjson');

function ensureLogFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf-8');
  }
}

export function appendSubtitleLog(record: SubtitleLogRecord): void {
  ensureLogFile();
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(record)}\n`, 'utf-8');
}

export function appendSubtitleLogBatch(records: SubtitleLogRecord[]): void {
  if (records.length === 0) return;
  ensureLogFile();
  const lines = records.map(record => JSON.stringify(record)).join('\n');
  fs.appendFileSync(LOG_FILE, `${lines}\n`, 'utf-8');
}

export function readSubtitleLogs(options: ReadSubtitleLogsOptions = {}): SubtitleLogRecord[] {
  ensureLogFile();

  const requestedLimit = Number.isFinite(options.limit ?? Number.NaN) ? (options.limit as number) : 200;
  const limit = Math.min(Math.max(requestedLimit, 1), 2000);
  const lines = fs.readFileSync(LOG_FILE, 'utf-8').split(/\r?\n/).filter(Boolean);
  const parsed: SubtitleLogRecord[] = [];

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const row = JSON.parse(lines[i]) as SubtitleLogRecord;
      if (options.runId && row.runId !== options.runId) continue;
      if (options.webinarId && row.webinarId !== options.webinarId) continue;
      parsed.push(row);
      if (parsed.length >= limit) break;
    } catch {
      // Skip malformed rows to avoid failing log reads in production.
    }
  }

  return parsed.reverse();
}
