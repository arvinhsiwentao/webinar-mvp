import { generateId } from '@/lib/db';
import { appendSubtitleLog, appendSubtitleLogBatch, type SubtitleLogRecord } from './log-store';
import type { SubtitleGenerationLogEvent } from './types';

interface SubtitleLoggerContext {
  runId?: string;
  webinarId?: string;
}

export class SubtitleGenerationLogger {
  readonly runId: string;
  readonly webinarId?: string;

  private readonly buffer: SubtitleLogRecord[] = [];

  constructor(context: SubtitleLoggerContext = {}) {
    this.runId = context.runId || `subrun-${generateId()}`;
    this.webinarId = context.webinarId;
  }

  log(event: SubtitleGenerationLogEvent): void {
    const row: SubtitleLogRecord = {
      id: generateId(),
      runId: this.runId,
      webinarId: this.webinarId,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.buffer.push(row);
  }

  flush(): void {
    appendSubtitleLogBatch(this.buffer);
    this.buffer.length = 0;
  }

  logAndFlush(event: SubtitleGenerationLogEvent): void {
    this.log(event);
    this.flush();
  }

  toPipelineHook(): { onLog: (event: SubtitleGenerationLogEvent) => void } {
    return {
      onLog: (event: SubtitleGenerationLogEvent) => {
        this.log(event);
      },
    };
  }
}

export function writeSubtitleGenerationError(
  errorMessage: string,
  context: SubtitleLoggerContext & { data?: Record<string, unknown> } = {},
): string {
  const runId = context.runId || `subrun-${generateId()}`;
  appendSubtitleLog({
    id: generateId(),
    runId,
    webinarId: context.webinarId,
    createdAt: new Date().toISOString(),
    stage: 'pipeline',
    level: 'error',
    message: errorMessage,
    data: context.data,
  });
  return runId;
}
