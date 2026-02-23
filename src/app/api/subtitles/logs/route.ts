import { NextRequest, NextResponse } from 'next/server';
import { readSubtitleLogs } from '@/lib/subtitles/log-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsedLimit = Number(searchParams.get('limit') ?? 200);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
  const runId = searchParams.get('runId') || undefined;
  const webinarId = searchParams.get('webinarId') || undefined;

  const logs = readSubtitleLogs({ limit, runId, webinarId });

  return NextResponse.json({
    count: logs.length,
    logs,
  });
}
