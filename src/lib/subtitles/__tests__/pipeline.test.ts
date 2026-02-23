import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSubtitleCuesFromWhisper } from '../pipeline';
import type { WhisperTranscript } from '../types';

function buildTranscript(words: Array<{ text: string; start: number; end: number }>): WhisperTranscript {
  return {
    language: 'en',
    segments: [
      {
        id: 0,
        start: words[0]?.start ?? 0,
        end: words[words.length - 1]?.end ?? 0,
        text: words.map(w => w.text).join(' '),
        words: words.map((w, index) => ({
          id: index,
          word: w.text,
          start: w.start,
          end: w.end,
          probability: 0.95,
        })),
      },
    ],
  };
}

test('merges punctuation and contraction tokens into readable text', () => {
  const transcript = buildTranscript([
    { text: 'Hello', start: 0.0, end: 0.2 },
    { text: ',', start: 0.2, end: 0.24 },
    { text: 'world', start: 0.26, end: 0.5 },
    { text: '!', start: 0.5, end: 0.54 },
    { text: 'I', start: 0.9, end: 1.0 },
    { text: 'don', start: 1.02, end: 1.2 },
    { text: "'t", start: 1.2, end: 1.27 },
    { text: 'know', start: 1.3, end: 1.55 },
    { text: '.', start: 1.55, end: 1.58 },
  ]);

  const result = generateSubtitleCuesFromWhisper(transcript);
  const allText = result.cues.map(cue => cue.text).join(' ');

  assert.match(allText, /Hello, world!/);
  assert.match(allText, /I don't know\./);
  assert.equal(result.metrics.punctuationFixes > 0, true);
});

test('enforces cinematic timing bounds and readable cps', () => {
  const transcript = buildTranscript([
    { text: 'This', start: 0.0, end: 0.08 },
    { text: 'is', start: 0.08, end: 0.14 },
    { text: 'a', start: 0.14, end: 0.17 },
    { text: 'very', start: 0.17, end: 0.26 },
    { text: 'dense', start: 0.26, end: 0.35 },
    { text: 'line', start: 0.35, end: 0.42 },
    { text: 'that', start: 0.42, end: 0.49 },
    { text: 'would', start: 0.49, end: 0.58 },
    { text: 'otherwise', start: 0.58, end: 0.7 },
    { text: 'be', start: 0.7, end: 0.76 },
    { text: 'too', start: 0.76, end: 0.83 },
    { text: 'fast', start: 0.83, end: 0.9 },
    { text: 'to', start: 0.9, end: 0.95 },
    { text: 'read', start: 0.95, end: 1.02 },
    { text: '.', start: 1.02, end: 1.04 },
  ]);

  const result = generateSubtitleCuesFromWhisper(transcript, {
    maxCharsPerLine: 24,
    maxCps: 17,
    minCueDurationSec: 1.0,
    maxCueDurationSec: 6,
  });

  for (const cue of result.cues) {
    const duration = cue.end - cue.start;
    assert.equal(duration >= 1.0 && duration <= 6.01, true);
    assert.equal(cue.cps <= 17.01, true);
    assert.equal(cue.lines.length <= 2, true);
  }
}
);

test('wraps to at most two balanced lines without punctuation-leading lines', () => {
  const transcript = buildTranscript([
    { text: 'Cinematic', start: 0.0, end: 0.2 },
    { text: 'subtitle', start: 0.2, end: 0.42 },
    { text: 'systems', start: 0.42, end: 0.62 },
    { text: 'must', start: 0.62, end: 0.75 },
    { text: 'preserve', start: 0.75, end: 0.94 },
    { text: 'phrase', start: 0.94, end: 1.1 },
    { text: 'boundaries', start: 1.1, end: 1.34 },
    { text: 'for', start: 1.34, end: 1.44 },
    { text: 'comfort', start: 1.44, end: 1.64 },
    { text: '.', start: 1.64, end: 1.68 },
  ]);

  const result = generateSubtitleCuesFromWhisper(transcript, {
    maxCharsPerLine: 20,
    maxCps: 15,
  });

  for (const cue of result.cues) {
    assert.equal(cue.lines.length <= 2, true);
    for (const line of cue.lines) {
      assert.equal(line.length <= 20, true);
    }
    if (cue.lines.length === 2) {
      assert.equal(/^[,.;:!?]/.test(cue.lines[1]), false);
    }
  }
});

test('returns monotonic cues and logs diagnostics for anomalies', () => {
  const transcript = buildTranscript([
    { text: 'Broken', start: 0.4, end: 0.6 },
    { text: 'timing', start: 0.2, end: 0.5 },
    { text: 'input', start: 0.5, end: 0.7 },
    { text: '.', start: 0.7, end: 0.72 },
  ]);

  const result = generateSubtitleCuesFromWhisper(transcript);
  assert.equal(result.cues.length > 0, true);
  assert.equal(result.metrics.anomaliesDetected > 0, true);

  let previousEnd = -1;
  for (const cue of result.cues) {
    assert.equal(cue.start >= previousEnd, true);
    assert.equal(cue.end > cue.start, true);
    previousEnd = cue.end;
  }
});
