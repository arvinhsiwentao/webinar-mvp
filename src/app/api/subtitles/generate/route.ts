import { NextRequest, NextResponse } from 'next/server';
import { updateWebinar } from '@/lib/db';
import { generateSubtitleCuesFromWhisper } from '@/lib/subtitles/pipeline';
import { SubtitleGenerationLogger, writeSubtitleGenerationError } from '@/lib/subtitles/logger';
import { assignTimestampsToScriptTokens } from '@/lib/subtitles/script-alignment';
import type { SubtitleGenerationOptions, WhisperTranscript, WhisperWord } from '@/lib/subtitles/types';

interface GenerateSubtitlesRequestBody {
  webinarId?: string;
  persistToWebinar?: boolean;
  transcript?: WhisperTranscript;
  scriptText?: string;
  scriptTokens?: string[];
  isCjk?: boolean;
  strictAlignment?: boolean;
  options?: Partial<SubtitleGenerationOptions>;
}

function flattenWhisperWords(transcript: WhisperTranscript): WhisperWord[] {
  const words: WhisperWord[] = [];
  for (const segment of transcript.segments) {
    if (segment.words?.length) {
      words.push(...segment.words);
    }
  }
  return words;
}

export async function POST(request: NextRequest) {
  let body: GenerateSubtitlesRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  if (!body.transcript?.segments?.length) {
    return NextResponse.json(
      { error: 'transcript.segments is required.' },
      { status: 400 },
    );
  }

  const logger = new SubtitleGenerationLogger({ webinarId: body.webinarId });

  try {
    logger.log({
      stage: 'request',
      level: 'info',
      message: 'Subtitle generation request received.',
      data: {
        segmentCount: body.transcript.segments.length,
        persistToWebinar: Boolean(body.persistToWebinar),
        scriptAnchored: Boolean(body.scriptText || (body.scriptTokens?.length ?? 0) > 0),
      },
    });

    let transcriptForGeneration = body.transcript;
    let alignmentPayload: ReturnType<typeof assignTimestampsToScriptTokens> | null = null;

    if (body.scriptText || (body.scriptTokens?.length ?? 0) > 0) {
      const whisperWords = flattenWhisperWords(body.transcript);
      alignmentPayload = assignTimestampsToScriptTokens({
        scriptText: body.scriptText,
        scriptTokens: body.scriptTokens,
        whisperWords,
        isCjk: body.isCjk ?? true,
      });

      logger.log({
        stage: 'align',
        level: alignmentPayload.warnings.length > 0 ? 'warn' : 'info',
        message: 'Aligned Whisper timings to script tokens.',
        data: {
          scriptCoreChars: alignmentPayload.stats.scriptCoreChars,
          whisperCoreChars: alignmentPayload.stats.whisperCoreChars,
          matchedChars: alignmentPayload.stats.matchedChars,
          unmatchedScriptChars: alignmentPayload.stats.unmatchedScriptChars,
          unmatchedCoreScriptTokens: alignmentPayload.stats.unmatchedCoreScriptTokens,
          coverageRatio: Number(alignmentPayload.stats.coverageRatio.toFixed(4)),
          warnings: alignmentPayload.warnings,
        },
      });

      const strictAlignment = body.strictAlignment ?? true;
      const alignmentFailed =
        alignmentPayload.stats.coverageRatio < 0.97 ||
        alignmentPayload.stats.unmatchedCoreScriptTokens > 0;

      if (strictAlignment && alignmentFailed) {
        logger.log({
          stage: 'align',
          level: 'error',
          message: 'Alignment quality gate failed. Aborting subtitle generation.',
          data: {
            coverageRatio: Number(alignmentPayload.stats.coverageRatio.toFixed(4)),
            unmatchedCoreScriptTokens: alignmentPayload.stats.unmatchedCoreScriptTokens,
          },
        });
        logger.flush();
        return NextResponse.json(
          {
            error: 'Alignment quality gate failed.',
            runId: logger.runId,
            alignment: alignmentPayload,
          },
          { status: 422 },
        );
      }

      const alignedWords: WhisperWord[] = alignmentPayload.tokens.map((token, index) => ({
        id: index,
        word: token.text,
        start: token.start,
        end: token.end,
        probability: token.confidence,
      }));

      transcriptForGeneration = {
        ...body.transcript,
        segments: [
          {
            id: 0,
            start: alignedWords[0]?.start ?? 0,
            end: alignedWords[alignedWords.length - 1]?.end ?? 0,
            text: alignmentPayload.tokens.map(token => token.text).join(body.isCjk === false ? ' ' : ''),
            words: alignedWords,
          },
        ],
      };
    }

    const result = generateSubtitleCuesFromWhisper(
      transcriptForGeneration,
      body.options,
      logger.toPipelineHook(),
    );

    if (body.persistToWebinar && body.webinarId) {
      const webinar = updateWebinar(body.webinarId, {
        subtitleCues: result.cues,
        subtitleLanguage: transcriptForGeneration.language ?? 'unknown',
        subtitleLastGeneratedAt: new Date().toISOString(),
      });

      if (!webinar) {
        logger.log({
          stage: 'persist',
          level: 'warn',
          message: 'Could not persist subtitles because webinar was not found.',
          data: { webinarId: body.webinarId },
        });
      } else {
        logger.log({
          stage: 'persist',
          level: 'info',
          message: 'Subtitle cues persisted to webinar record.',
          data: { webinarId: body.webinarId, cueCount: result.cues.length },
        });
      }
    }

    logger.log({
      stage: 'response',
      level: 'info',
      message: 'Subtitle generation completed.',
      data: {
        cueCount: result.cues.length,
        maxCps: Number(result.metrics.maxCps.toFixed(2)),
        maxCpl: result.metrics.maxCpl,
      },
    });

    logger.flush();

    return NextResponse.json({
      runId: logger.runId,
      alignment: alignmentPayload,
      ...result,
    });
  } catch (error) {
    const runId = writeSubtitleGenerationError('Subtitle generation failed.', {
      runId: logger.runId,
      webinarId: body.webinarId,
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Subtitle generation failed.', runId },
      { status: 500 },
    );
  }
}
