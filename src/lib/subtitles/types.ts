export interface WhisperWord {
  id?: number;
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface WhisperSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

export interface WhisperTranscript {
  language?: string;
  durationSec?: number;
  text?: string;
  segments: WhisperSegment[];
}

export interface SubtitleGenerationOptions {
  maxCharsPerLine: number;
  maxLines: number;
  minCueDurationSec: number;
  maxCueDurationSec: number;
  maxCps: number;
  minGapSec: number;
  pauseSplitSec: number;
}

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
  lines: string[];
  cps: number;
  cpl: number;
}

export interface SubtitleIssue {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

export interface SubtitleGenerationMetrics {
  cueCount: number;
  punctuationFixes: number;
  splitWordFixes: number;
  anomaliesDetected: number;
  avgCps: number;
  maxCps: number;
  maxCpl: number;
}

export interface SubtitleGenerationLogEvent {
  stage: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

export interface SubtitleGenerationHooks {
  onLog?: (event: SubtitleGenerationLogEvent) => void;
}

export interface SubtitleGenerationResult {
  cues: SubtitleCue[];
  metrics: SubtitleGenerationMetrics;
  issues: SubtitleIssue[];
  debug: SubtitleGenerationLogEvent[];
}
