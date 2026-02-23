import type { WhisperWord } from './types';

const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
const CJK_CHAR_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const MIN_TOKEN_DURATION_SEC = 0.04;

interface ScriptCoreChar {
  char: string;
  tokenIndex: number;
}

interface WhisperCoreChar {
  char: string;
  start: number;
  end: number;
  mid: number;
}

export interface TimedScriptToken {
  text: string;
  start: number;
  end: number;
  confidence: number;
  matchedChars: number;
  totalCoreChars: number;
}

export interface ScriptAlignmentStats {
  scriptCoreChars: number;
  whisperCoreChars: number;
  matchedChars: number;
  unmatchedScriptChars: number;
  unmatchedWhisperChars: number;
  coverageRatio: number;
  unmatchedCoreScriptTokens: number;
}

export interface ScriptAlignmentResult {
  tokens: TimedScriptToken[];
  stats: ScriptAlignmentStats;
  warnings: string[];
}

export interface AssignScriptTimestampsInput {
  scriptTokens?: string[];
  scriptText?: string;
  whisperWords: WhisperWord[];
  isCjk?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cleanWordTiming(word: WhisperWord): WhisperWord {
  const start = Number.isFinite(word.start) ? Math.max(0, word.start) : 0;
  const rawEnd = Number.isFinite(word.end) ? word.end : start + 0.2;
  const end = Math.max(start + MIN_TOKEN_DURATION_SEC, rawEnd);
  return {
    ...word,
    start,
    end,
  };
}

function isComparableChar(ch: string): boolean {
  return WORD_CHAR_RE.test(ch) || CJK_CHAR_RE.test(ch);
}

function toComparableChars(text: string): string[] {
  const normalized = text.normalize('NFKC').toLowerCase();
  const chars = Array.from(normalized).filter(ch => isComparableChar(ch));
  return chars;
}

function isAsciiWordChar(ch: string): boolean {
  return /^[a-z0-9\/]$/i.test(ch);
}

function isCjkChar(ch: string): boolean {
  return CJK_CHAR_RE.test(ch);
}

function isTrailingPunctuation(ch: string): boolean {
  return !isComparableChar(ch) && !/\s/u.test(ch);
}

export function tokenizeScriptText(scriptText: string, isCjk = false): string[] {
  const normalized = scriptText.normalize('NFKC');
  const chars = Array.from(normalized);
  const tokens: string[] = [];

  let asciiBuffer = '';
  const flushAscii = () => {
    if (asciiBuffer.length > 0) {
      tokens.push(asciiBuffer);
      asciiBuffer = '';
    }
  };

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (/\s/u.test(ch)) {
      flushAscii();
      continue;
    }

    if (isAsciiWordChar(ch)) {
      asciiBuffer += ch;
      continue;
    }

    flushAscii();

    if (isCjk && isCjkChar(ch)) {
      let token = ch;
      let j = i + 1;
      while (j < chars.length && isTrailingPunctuation(chars[j])) {
        token += chars[j];
        j += 1;
      }
      tokens.push(token);
      i = j - 1;
      continue;
    }

    tokens.push(ch);
  }

  flushAscii();
  return tokens;
}

function buildScriptCoreChars(scriptTokens: string[]): {
  chars: ScriptCoreChar[];
  tokenCoreIndices: number[][];
} {
  const chars: ScriptCoreChar[] = [];
  const tokenCoreIndices: number[][] = [];

  for (let tokenIndex = 0; tokenIndex < scriptTokens.length; tokenIndex += 1) {
    const token = scriptTokens[tokenIndex];
    const core = toComparableChars(token);
    const indices: number[] = [];
    for (const ch of core) {
      indices.push(chars.length);
      chars.push({
        char: ch,
        tokenIndex,
      });
    }
    tokenCoreIndices.push(indices);
  }

  return { chars, tokenCoreIndices };
}

function splitWordIntoComparableChars(word: WhisperWord): WhisperCoreChar[] {
  const clean = cleanWordTiming(word);
  const chars = toComparableChars(clean.word);
  if (chars.length === 0) return [];

  const duration = Math.max(MIN_TOKEN_DURATION_SEC, clean.end - clean.start);
  return chars.map((char, index) => {
    const partStart = clean.start + ((duration * index) / chars.length);
    const partEnd = clean.start + ((duration * (index + 1)) / chars.length);
    const safeEnd = Math.max(partStart + 0.01, partEnd);
    return {
      char,
      start: partStart,
      end: safeEnd,
      mid: (partStart + safeEnd) / 2,
    };
  });
}

function buildWhisperCoreChars(whisperWords: WhisperWord[]): WhisperCoreChar[] {
  const ordered = [...whisperWords]
    .map(cleanWordTiming)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const chars: WhisperCoreChar[] = [];
  for (const word of ordered) {
    chars.push(...splitWordIntoComparableChars(word));
  }
  return chars;
}

function lcsMatchIndices(scriptChars: ScriptCoreChar[], whisperChars: WhisperCoreChar[]): Array<[number, number]> {
  const n = scriptChars.length;
  const m = whisperChars.length;
  if (n === 0 || m === 0) return [];

  if (n * m > 6_000_000) {
    return greedyAnchorMatch(scriptChars, whisperChars);
  }

  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (scriptChars[i - 1].char === whisperChars[j - 1].char) {
        dp[i][j] = (dp[i - 1][j - 1] + 1) as number;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]) as number;
      }
    }
  }

  const matches: Array<[number, number]> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (scriptChars[i - 1].char === whisperChars[j - 1].char) {
      matches.push([i - 1, j - 1]);
      i -= 1;
      j -= 1;
      continue;
    }

    if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return matches.reverse();
}

function greedyAnchorMatch(scriptChars: ScriptCoreChar[], whisperChars: WhisperCoreChar[]): Array<[number, number]> {
  const matches: Array<[number, number]> = [];
  const lookahead = 12;

  let i = 0;
  let j = 0;
  while (i < scriptChars.length && j < whisperChars.length) {
    if (scriptChars[i].char === whisperChars[j].char) {
      matches.push([i, j]);
      i += 1;
      j += 1;
      continue;
    }

    let whisperJump = -1;
    for (let k = 1; k <= lookahead && j + k < whisperChars.length; k += 1) {
      if (scriptChars[i].char === whisperChars[j + k].char) {
        whisperJump = j + k;
        break;
      }
    }

    let scriptJump = -1;
    for (let k = 1; k <= lookahead && i + k < scriptChars.length; k += 1) {
      if (scriptChars[i + k].char === whisperChars[j].char) {
        scriptJump = i + k;
        break;
      }
    }

    if (whisperJump !== -1 && (scriptJump === -1 || whisperJump - j <= scriptJump - i)) {
      j = whisperJump;
      continue;
    }
    if (scriptJump !== -1) {
      i = scriptJump;
      continue;
    }

    i += 1;
    j += 1;
  }

  return matches;
}

interface CharTiming {
  start: number;
  end: number;
  matched: boolean;
}

function deriveScriptCharTimings(
  scriptChars: ScriptCoreChar[],
  whisperChars: WhisperCoreChar[],
  matches: Array<[number, number]>,
): CharTiming[] {
  const n = scriptChars.length;
  if (n === 0) return [];

  const map = new Array<number>(n).fill(-1);
  for (const [scriptIndex, whisperIndex] of matches) {
    map[scriptIndex] = whisperIndex;
  }

  const avgCharDuration = whisperChars.length > 0
    ? clamp(
      whisperChars.reduce((sum, c) => sum + Math.max(0.01, c.end - c.start), 0) / whisperChars.length,
      0.01,
      0.12,
    )
    : 0.05;
  const globalStart = whisperChars[0]?.start ?? 0;
  const globalEnd = whisperChars[whisperChars.length - 1]?.end ?? (globalStart + (avgCharDuration * n));

  const prevMatch = new Array<number>(n).fill(-1);
  const nextMatch = new Array<number>(n).fill(-1);
  let prev = -1;
  for (let i = 0; i < n; i += 1) {
    if (map[i] !== -1) prev = i;
    prevMatch[i] = prev;
  }
  let next = -1;
  for (let i = n - 1; i >= 0; i -= 1) {
    if (map[i] !== -1) next = i;
    nextMatch[i] = next;
  }

  const timings: CharTiming[] = new Array(n);

  for (let i = 0; i < n; i += 1) {
    const mapped = map[i];
    if (mapped !== -1) {
      const source = whisperChars[mapped];
      timings[i] = {
        start: source.start,
        end: source.end,
        matched: true,
      };
      continue;
    }

    const left = prevMatch[i];
    const right = nextMatch[i];
    if (left !== -1 && right !== -1 && left !== right) {
      const leftChar = timings[left] ?? {
        start: whisperChars[map[left]].start,
        end: whisperChars[map[left]].end,
      };
      const rightSource = whisperChars[map[right]];
      const ratio = (i - left) / (right - left);
      const leftMid = (leftChar.start + leftChar.end) / 2;
      const rightMid = rightSource.mid;
      const center = leftMid + ((rightMid - leftMid) * ratio);
      timings[i] = {
        start: center - (avgCharDuration / 2),
        end: center + (avgCharDuration / 2),
        matched: false,
      };
      continue;
    }

    if (left !== -1) {
      const leftTiming = timings[left] ?? {
        start: whisperChars[map[left]].start,
        end: whisperChars[map[left]].end,
      };
      timings[i] = {
        start: leftTiming.end,
        end: leftTiming.end + avgCharDuration,
        matched: false,
      };
      continue;
    }

    if (right !== -1) {
      const rightChar = whisperChars[map[right]];
      timings[i] = {
        start: rightChar.start - avgCharDuration,
        end: rightChar.start,
        matched: false,
      };
      continue;
    }

    const ratio = n <= 1 ? 0 : i / (n - 1);
    const center = globalStart + ((globalEnd - globalStart) * ratio);
    timings[i] = {
      start: center - (avgCharDuration / 2),
      end: center + (avgCharDuration / 2),
      matched: false,
    };
  }

  let cursor = globalStart;
  for (let i = 0; i < timings.length; i += 1) {
    const current = timings[i];
    const start = Math.max(cursor, current.start);
    const end = Math.max(start + 0.01, current.end);
    timings[i] = { ...current, start, end };
    cursor = end;
  }

  return timings;
}

function resolvePunctuationTokenTiming(
  index: number,
  tokens: TimedScriptToken[],
): { start: number; end: number } {
  let prevIndex = -1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (tokens[i].totalCoreChars > 0) {
      prevIndex = i;
      break;
    }
  }

  let nextIndex = -1;
  for (let i = index + 1; i < tokens.length; i += 1) {
    if (tokens[i].totalCoreChars > 0) {
      nextIndex = i;
      break;
    }
  }

  if (prevIndex !== -1 && nextIndex !== -1) {
    const prev = tokens[prevIndex];
    const next = tokens[nextIndex];
    const gap = Math.max(0, next.start - prev.end);
    if (gap < MIN_TOKEN_DURATION_SEC) {
      return { start: prev.end, end: prev.end + MIN_TOKEN_DURATION_SEC };
    }
    const center = prev.end + (gap / 2);
    return {
      start: center - (MIN_TOKEN_DURATION_SEC / 2),
      end: center + (MIN_TOKEN_DURATION_SEC / 2),
    };
  }

  if (prevIndex !== -1) {
    const prev = tokens[prevIndex];
    return { start: prev.end, end: prev.end + MIN_TOKEN_DURATION_SEC };
  }

  if (nextIndex !== -1) {
    const next = tokens[nextIndex];
    return { start: Math.max(0, next.start - MIN_TOKEN_DURATION_SEC), end: next.start };
  }

  return { start: 0, end: MIN_TOKEN_DURATION_SEC };
}

function finalizeTokenMonotonicity(tokens: TimedScriptToken[]): TimedScriptToken[] {
  if (tokens.length === 0) return [];

  let cursor = Math.max(0, tokens[0].start);
  const output: TimedScriptToken[] = [];
  for (const token of tokens) {
    const start = Math.max(cursor, token.start);
    const end = Math.max(start + MIN_TOKEN_DURATION_SEC, token.end);
    output.push({
      ...token,
      start,
      end,
    });
    cursor = end;
  }
  return output;
}

export function assignTimestampsToScriptTokens(input: AssignScriptTimestampsInput): ScriptAlignmentResult {
  const scriptTokens = input.scriptTokens && input.scriptTokens.length > 0
    ? input.scriptTokens
    : tokenizeScriptText(input.scriptText ?? '', input.isCjk ?? false);
  const whisperChars = buildWhisperCoreChars(input.whisperWords ?? []);
  const { chars: scriptChars, tokenCoreIndices } = buildScriptCoreChars(scriptTokens);

  const warnings: string[] = [];
  const matches = lcsMatchIndices(scriptChars, whisperChars);
  const charTimings = deriveScriptCharTimings(scriptChars, whisperChars, matches);

  const matchedByScriptChar = new Array<number>(scriptChars.length).fill(-1);
  for (const [scriptIndex, whisperIndex] of matches) {
    matchedByScriptChar[scriptIndex] = whisperIndex;
  }

  const tokens: TimedScriptToken[] = scriptTokens.map((text, tokenIndex) => {
    const charIndices = tokenCoreIndices[tokenIndex];
    if (charIndices.length === 0) {
      return {
        text,
        start: 0,
        end: MIN_TOKEN_DURATION_SEC,
        confidence: 1,
        matchedChars: 0,
        totalCoreChars: 0,
      };
    }

    const first = charTimings[charIndices[0]];
    const last = charTimings[charIndices[charIndices.length - 1]];
    const matchedChars = charIndices.filter(idx => matchedByScriptChar[idx] !== -1).length;
    const confidence = matchedChars / charIndices.length;

    return {
      text,
      start: first.start,
      end: last.end,
      confidence,
      matchedChars,
      totalCoreChars: charIndices.length,
    };
  });

  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].totalCoreChars > 0) continue;
    const replacement = resolvePunctuationTokenTiming(i, tokens);
    tokens[i] = {
      ...tokens[i],
      start: replacement.start,
      end: replacement.end,
    };
  }

  const monotonicTokens = finalizeTokenMonotonicity(tokens);
  const matchedChars = matches.length;
  const unmatchedScriptChars = Math.max(0, scriptChars.length - matchedChars);
  const unmatchedWhisperChars = Math.max(0, whisperChars.length - matchedChars);
  const coverageRatio = scriptChars.length > 0 ? matchedChars / scriptChars.length : 1;
  const unmatchedCoreScriptTokens = monotonicTokens.filter(
    token => token.totalCoreChars > 0 && token.matchedChars === 0,
  ).length;

  if (coverageRatio < 0.98) {
    warnings.push(`Low script coverage: ${(coverageRatio * 100).toFixed(2)}%`);
  }
  if (unmatchedCoreScriptTokens > 0) {
    warnings.push(`Unmatched core script tokens: ${unmatchedCoreScriptTokens}`);
  }
  if (unmatchedWhisperChars > scriptChars.length * 0.1) {
    warnings.push(`Whisper had substantial unmatched chars: ${unmatchedWhisperChars}`);
  }

  return {
    tokens: monotonicTokens,
    stats: {
      scriptCoreChars: scriptChars.length,
      whisperCoreChars: whisperChars.length,
      matchedChars,
      unmatchedScriptChars,
      unmatchedWhisperChars,
      coverageRatio,
      unmatchedCoreScriptTokens,
    },
    warnings,
  };
}
