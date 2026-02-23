# Subtitle Cascade Drift RCA (From Session Log)

## Symptom

Alignment begins correctly, then drifts after the first mixed-token boundary (Latin/number/punctuation), producing:

- token index shift (`P/E`, `10`, `15` mismatched)
- long tail of incorrect token-to-word assignments
- final overflow (`15 script tokens without Whisper coverage`)

## Evidence From Log

- First critical mismatch cluster:
  - `Latin token "P/E" ← 3 Whisper words ["P"+"E"+"可能"]`
  - followed by `word[21] "10" -> token ["可"]`, then `token "10" ← ["15"]`
- Second mismatch cluster:
  - `token "2026" ← ["河"+"長"+"什麼"]`
- Third mismatch cluster:
  - `token "deepfake" ← ["這"+"背"+"後"+"需要"+"的是"+"海"]`
- Final overflow:
  - `OVERFLOW: 15 script tokens without Whisper coverage`

This is the canonical signature of **blind token consumption after low-confidence mismatch**.

## Root Causes

1. Greedy consume-on-fail logic
- The previous strategy appears to advance either script index or word index even when mixed-token normalization fails.
- One mismatch therefore shifts all subsequent boundaries (cascade).

2. Weak boundary normalization for mixed tokens
- `P/E`, `2026`, `deepfake`, quotes/newlines, and CJK punctuation are treated inconsistently across script and Whisper tokens.
- Equivalent textual content is represented with different granularity (`2026` vs `20` + `26`, `deepfake` vs `deep` + `f` + `ake`).

3. Global similarity metric used as false confidence
- `100% bag/sequential` can still hide local boundary failures.
- Local alignment quality requires per-token/per-char coverage metrics.

4. No hard quality gate
- Generation continued despite local mismatch cascade and large overflow.
- System should fail fast or fallback when coverage drops.

## Fixes Implemented

1. Deterministic no-cascade aligner
- New module: `src/lib/subtitles/script-alignment.ts`
- Uses comparable-core character alignment (LCS), then interpolates unmatched chars.
- Prevents token index cascade from localized mismatches.

2. Mixed-token normalization
- Comparable core strips punctuation/whitespace noise while preserving letters/numbers/CJK.
- Handles:
  - `P/E` <-> `P` + `E`
  - `2026` <-> `20` + `26`
  - `deepfake` <-> `deep` + `f` + `ake`
  - quote/newline punctuation artifacts

3. Quality gates in generation API
- `POST /api/subtitles/generate` now supports script-anchored alignment.
- Fails with HTTP 422 when strict alignment gate fails:
  - low coverage ratio
  - unmatched core script tokens

4. Structured observability
- Alignment stats and warnings are logged with `runId`.
- Provides coverage, unmatched counts, and warning list to detect regressions quickly.

## Regression Tests Added

- `src/lib/subtitles/__tests__/script-alignment.test.ts`
  - mixed CJK + Latin acronym without drift
  - split-year (`2026`) and split-english (`deepfake`) convergence
  - punctuation/newline-heavy script without overflow
  - local mismatch re-anchor (no downstream cascade)

## Operational Guardrails

1. Keep `strictAlignment=true` in production.
2. Alert when:
- coverage ratio < 0.98
- unmatched core script tokens > 0
3. Persist run logs and sample bad runs for replay tests.
4. Treat alignment gate failures as quality incidents, not soft warnings.
