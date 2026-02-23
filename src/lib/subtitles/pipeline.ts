import type {
  SubtitleCue,
  SubtitleGenerationHooks,
  SubtitleGenerationLogEvent,
  SubtitleGenerationMetrics,
  SubtitleGenerationOptions,
  SubtitleGenerationResult,
  SubtitleIssue,
  WhisperTranscript,
  WhisperWord,
} from './types';

interface NormalizedWord {
  text: string;
  start: number;
  end: number;
}

interface CueDraft {
  words: NormalizedWord[];
  start: number;
  end: number;
  text: string;
}

const SENTENCE_END_RE = /[.!?。！？]$/u;
const PUNCT_ONLY_RE = /^[,.;:!?。，！？、…]+$/u;
const LINE_START_PUNCT_RE = /^[,.;:!?。，！？、…]/u;
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const APOS_PREFIX_RE = /^['’][a-z]+$/i;

const DEFAULT_OPTIONS: SubtitleGenerationOptions = {
  maxCharsPerLine: 42,
  maxLines: 2,
  minCueDurationSec: 1.0,
  maxCueDurationSec: 6.0,
  maxCps: 17,
  minGapSec: 0.08,
  pauseSplitSec: 0.65,
};

function isCjkText(text: string): boolean {
  return CJK_RE.test(text);
}

function pushLog(
  logs: SubtitleGenerationLogEvent[],
  hooks: SubtitleGenerationHooks | undefined,
  event: SubtitleGenerationLogEvent,
) {
  logs.push(event);
  hooks?.onLog?.(event);
}

function roundTime(value: number): number {
  return Number(value.toFixed(3));
}

function clampDuration(start: number, end: number): number {
  return Math.max(0.04, end - start);
}

function sanitizeWordTiming(word: WhisperWord): NormalizedWord {
  const start = Number.isFinite(word.start) ? Math.max(0, word.start) : 0;
  let end = Number.isFinite(word.end) ? Math.max(start + 0.04, word.end) : start + 0.2;
  if (end <= start) {
    end = start + 0.04;
  }

  return {
    text: word.word.trim(),
    start,
    end,
  };
}

function splitFallbackWords(text: string, start: number, end: number): NormalizedWord[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const units = isCjkText(trimmed) ? trimmed.split('') : trimmed.split(/\s+/);
  if (units.length === 0) return [];

  const span = Math.max(0.2, end - start);
  const step = span / units.length;

  return units.map((unit, index) => {
    const wStart = start + (step * index);
    const wEnd = index === units.length - 1 ? end : wStart + step;
    return {
      text: unit,
      start: wStart,
      end: Math.max(wStart + 0.04, wEnd),
    };
  });
}

function extractWords(
  transcript: WhisperTranscript,
  metrics: SubtitleGenerationMetrics,
  issues: SubtitleIssue[],
  logs: SubtitleGenerationLogEvent[],
  hooks?: SubtitleGenerationHooks,
): NormalizedWord[] {
  const words: NormalizedWord[] = [];

  for (const segment of transcript.segments ?? []) {
    if (segment.words?.length) {
      for (const word of segment.words) {
        const normalized = sanitizeWordTiming(word);
        if (!normalized.text) continue;
        words.push(normalized);
      }
      continue;
    }

    const fallback = splitFallbackWords(segment.text, segment.start, segment.end);
    if (fallback.length > 0) {
      issues.push({
        code: 'segment_without_words',
        message: 'Whisper segment missing word-level timestamps; using fallback tokenization.',
        severity: 'warn',
        data: { segmentId: segment.id ?? null, tokenCount: fallback.length },
      });
      pushLog(logs, hooks, {
        stage: 'extract',
        level: 'warn',
        message: 'Segment missing word timings. Fallback tokenization applied.',
        data: { segmentId: segment.id ?? null, tokenCount: fallback.length },
      });
      words.push(...fallback);
    }
  }

  const sorted = [...words].sort((a, b) => a.start - b.start || a.end - b.end);
  if (!hasSameOrder(words, sorted)) {
    metrics.anomaliesDetected += 1;
    issues.push({
      code: 'non_monotonic_word_input',
      message: 'Input word timings were non-monotonic and have been re-ordered.',
      severity: 'warn',
    });
    pushLog(logs, hooks, {
      stage: 'extract',
      level: 'warn',
      message: 'Detected non-monotonic word timestamps; sorted for alignment.',
      data: { inputCount: words.length },
    });
  } else {
    pushLog(logs, hooks, {
      stage: 'extract',
      level: 'info',
      message: 'Extracted word-level timings.',
      data: { inputCount: words.length },
    });
  }

  return sorted;
}

function hasSameOrder(a: NormalizedWord[], b: NormalizedWord[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].start !== b[i].start || a[i].end !== b[i].end || a[i].text !== b[i].text) {
      return false;
    }
  }
  return true;
}

function normalizeTokenSequence(
  words: NormalizedWord[],
  metrics: SubtitleGenerationMetrics,
): NormalizedWord[] {
  const normalized: NormalizedWord[] = [];

  for (const word of words) {
    if (!word.text) continue;

    const prev = normalized[normalized.length - 1];
    if (!prev) {
      normalized.push({ ...word });
      continue;
    }

    if (PUNCT_ONLY_RE.test(word.text)) {
      prev.text += word.text;
      prev.end = Math.max(prev.end, word.end);
      metrics.punctuationFixes += 1;
      continue;
    }

    if (APOS_PREFIX_RE.test(word.text)) {
      prev.text += word.text;
      prev.end = Math.max(prev.end, word.end);
      metrics.splitWordFixes += 1;
      continue;
    }

    if (word.text === '-' && prev.text.length > 0) {
      prev.text += '-';
      prev.end = Math.max(prev.end, word.end);
      metrics.splitWordFixes += 1;
      continue;
    }

    normalized.push({ ...word });
  }

  return normalized;
}

function needsSpace(previous: string, current: string): boolean {
  if (!previous) return false;
  if (!current) return false;
  if (PUNCT_ONLY_RE.test(current)) return false;
  if (LINE_START_PUNCT_RE.test(current)) return false;

  const prevLast = previous[previous.length - 1];
  const currFirst = current[0];
  if (!prevLast || !currFirst) return true;

  if (isCjkText(prevLast) && isCjkText(currFirst)) return false;
  if (prevLast === '“' || prevLast === '‘' || prevLast === '(' || prevLast === '[') return false;
  return true;
}

function joinWords(words: NormalizedWord[]): string {
  let text = '';
  for (const word of words) {
    if (!text) {
      text = word.text;
      continue;
    }
    text += needsSpace(text, word.text) ? ` ${word.text}` : word.text;
  }
  return text.trim();
}

function splitIntoDraftCues(
  words: NormalizedWord[],
  options: SubtitleGenerationOptions,
): CueDraft[] {
  if (words.length === 0) return [];

  const drafts: CueDraft[] = [];
  let bucket: NormalizedWord[] = [];

  const flush = () => {
    if (bucket.length === 0) return;
    drafts.push({
      words: bucket,
      start: bucket[0].start,
      end: bucket[bucket.length - 1].end,
      text: joinWords(bucket),
    });
    bucket = [];
  };

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const next = words[i + 1];
    bucket.push(word);

    const text = joinWords(bucket);
    const charBudget = options.maxCharsPerLine * options.maxLines;
    const duration = word.end - bucket[0].start;
    const pauseToNext = next ? next.start - word.end : 0;
    const shouldSplit =
      SENTENCE_END_RE.test(word.text) ||
      pauseToNext >= options.pauseSplitSec ||
      text.length >= charBudget ||
      duration >= options.maxCueDurationSec;

    if (shouldSplit) {
      flush();
    }
  }

  flush();
  return drafts;
}

function hardWrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const lines: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxCharsPerLine || lines.length === maxLines - 1) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.slice(0, maxCharsPerLine));
    remaining = remaining.slice(maxCharsPerLine).trimStart();
  }
  return lines;
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.length <= maxCharsPerLine) {
    return [trimmed];
  }

  if (isCjkText(trimmed) && !trimmed.includes(' ')) {
    return hardWrapText(trimmed, maxCharsPerLine, maxLines);
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return hardWrapText(trimmed, maxCharsPerLine, maxLines);
  }

  let best: string[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ');
    const second = words.slice(i).join(' ');

    if (first.length > maxCharsPerLine || second.length > maxCharsPerLine) continue;
    if (LINE_START_PUNCT_RE.test(second)) continue;

    const balancePenalty = Math.abs(first.length - second.length);
    const lengthPenalty = Math.max(first.length, second.length);
    const score = (balancePenalty * 2) + lengthPenalty;

    if (score < bestScore) {
      bestScore = score;
      best = [first, second];
    }
  }

  if (best) return best;
  return hardWrapText(trimmed, maxCharsPerLine, maxLines);
}

function applyCueTimingAndLayout(
  drafts: CueDraft[],
  options: SubtitleGenerationOptions,
  metrics: SubtitleGenerationMetrics,
): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let prevEnd = 0;

  drafts.forEach((draft, index) => {
    const charCount = draft.text.length;
    const minFromCps = charCount / options.maxCps;
    const targetDuration = Math.max(options.minCueDurationSec, minFromCps);
    const cappedDuration = Math.min(options.maxCueDurationSec, targetDuration);

    const minStart = index === 0 ? 0 : prevEnd + options.minGapSec;
    const start = roundTime(Math.max(draft.start, minStart));
    const end = roundTime(start + cappedDuration);
    const duration = clampDuration(start, end);
    const cps = duration > 0 ? charCount / duration : 0;
    const lines = wrapLines(draft.text, options.maxCharsPerLine, options.maxLines);
    const cpl = lines.reduce((acc, line) => Math.max(acc, line.length), 0);

    cues.push({
      id: `cue-${index + 1}`,
      start,
      end,
      text: draft.text,
      lines,
      cps,
      cpl,
    });

    prevEnd = end;
  });

  if (cues.length > 0) {
    const cpsValues = cues.map(cue => cue.cps);
    metrics.avgCps = cpsValues.reduce((sum, value) => sum + value, 0) / cpsValues.length;
    metrics.maxCps = cpsValues.reduce((max, value) => Math.max(max, value), 0);
    metrics.maxCpl = cues.reduce((max, cue) => Math.max(max, cue.cpl), 0);
  } else {
    metrics.avgCps = 0;
    metrics.maxCps = 0;
    metrics.maxCpl = 0;
  }

  return cues;
}

export function generateSubtitleCuesFromWhisper(
  transcript: WhisperTranscript,
  inputOptions: Partial<SubtitleGenerationOptions> = {},
  hooks?: SubtitleGenerationHooks,
): SubtitleGenerationResult {
  const options: SubtitleGenerationOptions = { ...DEFAULT_OPTIONS, ...inputOptions };
  const debug: SubtitleGenerationLogEvent[] = [];
  const issues: SubtitleIssue[] = [];

  const metrics: SubtitleGenerationMetrics = {
    cueCount: 0,
    punctuationFixes: 0,
    splitWordFixes: 0,
    anomaliesDetected: 0,
    avgCps: 0,
    maxCps: 0,
    maxCpl: 0,
  };

  const extracted = extractWords(transcript, metrics, issues, debug, hooks);
  if (extracted.length === 0) {
    issues.push({
      code: 'empty_transcript',
      severity: 'error',
      message: 'Transcript does not include words that can be converted into subtitle cues.',
    });
    pushLog(debug, hooks, {
      stage: 'pipeline',
      level: 'error',
      message: 'No usable words found in transcript.',
    });
    return { cues: [], metrics, issues, debug };
  }

  const normalized = normalizeTokenSequence(extracted, metrics);
  pushLog(debug, hooks, {
    stage: 'normalize',
    level: 'info',
    message: 'Normalized punctuation and split words.',
    data: {
      inputCount: extracted.length,
      outputCount: normalized.length,
      punctuationFixes: metrics.punctuationFixes,
      splitWordFixes: metrics.splitWordFixes,
    },
  });

  const drafts = splitIntoDraftCues(normalized, options);
  pushLog(debug, hooks, {
    stage: 'segment',
    level: 'info',
    message: 'Segmented normalized words into cue drafts.',
    data: { draftCount: drafts.length },
  });

  const cues = applyCueTimingAndLayout(drafts, options, metrics);
  metrics.cueCount = cues.length;

  if (metrics.maxCps > options.maxCps + 0.01) {
    issues.push({
      code: 'cps_overflow',
      severity: 'warn',
      message: 'Some cues still exceed max CPS after normalization.',
      data: { maxCps: metrics.maxCps, threshold: options.maxCps },
    });
  }

  pushLog(debug, hooks, {
    stage: 'finalize',
    level: 'info',
    message: 'Generated subtitle cues and quality metrics.',
    data: {
      cueCount: metrics.cueCount,
      avgCps: Number(metrics.avgCps.toFixed(2)),
      maxCps: Number(metrics.maxCps.toFixed(2)),
      maxCpl: metrics.maxCpl,
      anomalyCount: metrics.anomaliesDetected,
    },
  });

  return {
    cues,
    metrics,
    issues,
    debug,
  };
}
