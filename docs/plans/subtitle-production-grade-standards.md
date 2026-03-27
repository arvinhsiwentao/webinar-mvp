# Subtitle System Overhaul: Production-Grade Standard

## 1) Audit of Current System (This Repo)

### Existing logging/debug workflow before this change
- Global tracking was generic event logging (`/api/track` -> `data/events.json`) with no subtitle-specific diagnostics.
- No subtitle generation pipeline existed in the codebase.
- No subtitle rendering layer existed in the live room.
- Playback updates were emitted at 1-second granularity in `VideoPlayer`, which is too coarse for subtitle sync.

### Root causes found
- Missing domain pipeline: no deterministic segmentation/alignment stage between ASR output and renderer.
- Missing observability: no per-stage metrics/logs for punctuation fixes, timing anomalies, cue readability.
- Timing quantization bug: subtitle-triggering state only updated once per second, causing visible lag and jumps.
- No style/rules engine: no enforcement of max lines, line length, duration, CPS, or line-break grammar.

## 2) Cinematic / Production-Grade Subtitle Standards

This implementation targets a practical intersection of major platform and accessibility standards:

- Line shape and segmentation:
  - Max 2 lines.
  - Break at punctuation/grammar boundaries.
  - Avoid splitting tightly-coupled phrase units.
- Density/readability:
  - Controlled characters per line.
  - Controlled reading speed (CPS / WPM equivalent).
  - Avoid very short flashes and very long hangs.
- Timing:
  - In/out synced to speech and visual rhythm.
  - Minimum inter-cue gap to prevent flicker.
  - Shot-aware behavior is ideal for finishing pass.
- Delivery format:
  - Cue model must map directly to WebVTT timed cues and CSS rendering controls.

### Primary references
- Netflix Subtitle Templates + Timing + US English TTSG:
  - https://partnerhelp.netflixstudios.com/hc/en-us/articles/219375728-Timed-Text-Style-Guide-Subtitle-Templates
  - https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines
  - https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- DCMP Captioning Key / Guidelines:
  - https://dcmp.org/captioningkey/print
  - https://dcmp.org/learn/5-captioning-guidelines-for-the-dcmp
- WebVTT spec:
  - https://www.w3.org/TR/webvtt1/

## 3) Whisper Output: What Is Typically Missing

Whisper is strong ASR, but raw output is not automatically subtitle-master quality:

- Long-form drift/repetition risk:
  - Whisper itself documents 30-second sliding-window decoding and prompt carry behavior.
  - Prompt carry can reduce inconsistency but is also associated with repetition/timestamp-loop failure cases when conditions are poor.
- Word timing limitations:
  - Word timestamps are estimated from attention + DTW.
  - Translation mode warns word timestamps may be unreliable.
- Punctuation/tokenization artifacts:
  - Whisper exposes punctuation-merge controls, which implies post-processing is expected for clean word boundaries.
- Long-form accuracy gap:
  - WhisperX reports drift/hallucination/repetition and timestamp inaccuracy for long-form buffered/sliding approaches, and improves this with VAD + forced phoneme alignment.

### Primary references
- Whisper README + transcribe implementation:
  - https://raw.githubusercontent.com/openai/whisper/main/README.md
  - https://raw.githubusercontent.com/openai/whisper/main/whisper/transcribe.py
- Whisper paper:
  - https://arxiv.org/abs/2212.04356
- WhisperX paper:
  - https://arxiv.org/abs/2303.00747

## 4) Implemented in This Overhaul

### A. New deterministic subtitle pipeline
- `src/lib/subtitles/pipeline.ts`
- `src/lib/subtitles/types.ts`

What it now does:
- Normalizes Whisper word tokens.
- Fixes punctuation and contraction splits.
- Re-orders non-monotonic word timings.
- Splits cues by punctuation, pause, duration, and line budget.
- Enforces timing/readability constraints (duration, CPS, line count, line length).
- Produces explicit metrics and structured issues for QA.

### B. Robust logging architecture
- `src/lib/subtitles/log-store.ts`
- `src/lib/subtitles/logger.ts`
- `data/subtitle-generation.ndjson` (append-only structured logs)

Added telemetry dimensions:
- runId, webinarId
- stage (`request`, `extract`, `normalize`, `segment`, `finalize`, `persist`, `response`)
- severity
- stage payload (counts, metrics, anomalies)

### C. API surface
- Generate subtitles: `POST /api/subtitles/generate`
  - `src/app/api/subtitles/generate/route.ts`
- Read logs: `GET /api/subtitles/logs`
  - `src/app/api/subtitles/logs/route.ts`

`/api/subtitles/generate` can optionally persist cues onto webinar records.

### D. Rendering + sync quality
- Added overlay renderer:
  - `src/components/subtitles/SubtitleOverlay.tsx`
- Integrated into live room:
  - `src/app/(public)/webinar/[id]/live/page.tsx`
- Patched time update precision from 1s to 100ms:
  - `src/components/video/VideoPlayer.tsx`

This directly addresses subtitle-audio visual mismatch caused by coarse playback event quantization.

## 5) Best-Practice Algorithms for Next Iteration

The current overhaul is a reliable baseline. For top-tier finishing, add:

- Forced alignment pass (phoneme-level or CTC/Viterbi aligner).
- VAD Cut & Merge before ASR to reduce drift and hallucination.
- Language-aware segmentation heuristics (CJK vs whitespace languages).
- Shot-change-aware retiming pass (in/out snapping within tolerance windows).
- Confidence-aware editing:
  - low-confidence tokens flagged for fallback re-decode or human review.
- Quality gate in CI:
  - fail generation if CPS/CPL/duration/overlap thresholds are exceeded.

## 6) Operational QA Metrics to Track

- max/avg CPS per file
- % cues over CPL threshold
- punctuation merge count per minute
- non-monotonic timing correction count
- overlap/gap violations
- drift proxy:
  - subtitle event change latency vs player timeupdate cadence

These are now available to log and can be turned into dashboards.
