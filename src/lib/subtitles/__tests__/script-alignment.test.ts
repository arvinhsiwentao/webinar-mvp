import assert from 'node:assert/strict';
import test from 'node:test';
import { assignTimestampsToScriptTokens } from '../script-alignment';
import type { WhisperWord } from '../types';

function ww(word: string, start: number, end: number): WhisperWord {
  return { word, start, end };
}

test('aligns mixed CJK + Latin acronym without index drift', () => {
  const scriptTokens = ['本', '益', '比', 'P/E', '可', '能', '10', '到', '15', '倍。'];
  const whisperWords: WhisperWord[] = [
    ww('本', 0.0, 0.12),
    ww('益', 0.12, 0.26),
    ww('比', 0.26, 0.4),
    ww('P', 0.4, 0.52),
    ww('E', 0.52, 0.66),
    ww('可能', 0.66, 1.1),
    ww('10', 1.1, 1.3),
    ww('到', 1.3, 1.42),
    ww('15', 1.42, 1.62),
    ww('倍', 1.62, 1.8),
  ];

  const result = assignTimestampsToScriptTokens({
    scriptTokens,
    whisperWords,
    isCjk: true,
  });

  assert.equal(result.tokens.length, scriptTokens.length);
  assert.equal(result.stats.unmatchedScriptChars, 0);
  assert.equal(result.stats.coverageRatio >= 0.99, true);

  const pe = result.tokens[3];
  const ke = result.tokens[4];
  const neng = result.tokens[5];
  assert.equal(pe.text, 'P/E');
  assert.equal(ke.text, '可');
  assert.equal(neng.text, '能');
  assert.equal(pe.start >= 0.39 && pe.end <= 0.67, true);
  assert.equal(ke.start >= 0.66 && ke.end <= neng.start, true);
});

test('aligns split year and deepfake fragments as one script token each', () => {
  const scriptTokens = ['至', '於', '2026', '年', 'deepfake', '攻', '擊'];
  const whisperWords: WhisperWord[] = [
    ww('至', 0.0, 0.1),
    ww('於', 0.1, 0.24),
    ww('20', 0.24, 0.44),
    ww('26', 0.44, 0.64),
    ww('年', 0.64, 0.78),
    ww('deep', 0.78, 1.1),
    ww('f', 1.1, 1.18),
    ww('ake', 1.18, 1.38),
    ww('攻', 1.38, 1.5),
    ww('擊', 1.5, 1.62),
  ];

  const result = assignTimestampsToScriptTokens({
    scriptTokens,
    whisperWords,
    isCjk: true,
  });

  const y2026 = result.tokens[2];
  const deepfake = result.tokens[4];
  assert.equal(y2026.text, '2026');
  assert.equal(deepfake.text, 'deepfake');
  assert.equal(y2026.start <= 0.26 && y2026.end >= 0.62, true);
  assert.equal(deepfake.start <= 0.8 && deepfake.end >= 1.36, true);
  assert.equal(result.stats.unmatchedScriptChars, 0);
});

test('does not overflow on punctuation/newline-heavy script tokens', () => {
  const scriptTokens = ['賣。\n\n', '「', '基', '礎', '設', '施', '」', '，', '護', '城', '河', '。'];
  const whisperWords: WhisperWord[] = [
    ww('賣', 0.0, 0.2),
    ww('基', 0.2, 0.34),
    ww('礎', 0.34, 0.52),
    ww('設', 0.52, 0.68),
    ww('施', 0.68, 0.82),
    ww('護', 0.82, 0.98),
    ww('城', 0.98, 1.12),
    ww('河', 1.12, 1.28),
  ];

  const result = assignTimestampsToScriptTokens({
    scriptTokens,
    whisperWords,
    isCjk: true,
  });

  assert.equal(result.stats.unmatchedCoreScriptTokens, 0);
  assert.equal(result.stats.coverageRatio >= 0.99, true);
  assert.equal(result.tokens[result.tokens.length - 1].end >= 1.27, true);
});

test('prevents cascade after local mismatch by re-anchoring later tokens', () => {
  const scriptTokens = ['我', '們', '討', '論', 'P/E', '與', '估', '值'];
  const whisperWords: WhisperWord[] = [
    ww('我們', 0.0, 0.4),
    ww('討論', 0.4, 0.72),
    ww('P', 0.72, 0.8),
    ww('E', 0.8, 0.9),
    ww('可能', 0.9, 1.2), // noise around acronym boundary
    ww('與', 1.2, 1.28),
    ww('估', 1.28, 1.38),
    ww('值', 1.38, 1.52),
  ];

  const result = assignTimestampsToScriptTokens({
    scriptTokens,
    whisperWords,
    isCjk: true,
  });

  const yu = result.tokens[5];
  const gu = result.tokens[6];
  const zhi = result.tokens[7];
  assert.equal(yu.text, '與');
  assert.equal(gu.text, '估');
  assert.equal(zhi.text, '值');
  assert.equal(yu.start >= 1.18, true);
  assert.equal(gu.start >= yu.end, true);
  assert.equal(zhi.start >= gu.end, true);
});
