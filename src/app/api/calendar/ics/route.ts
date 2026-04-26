import { NextRequest } from 'next/server';
import { generateICSContent } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Webinar';
  const start = searchParams.get('start') || '';
  const duration = parseInt(searchParams.get('duration') || '60', 10);
  const url = searchParams.get('url') || '';
  const desc = searchParams.get('desc') || '';

  if (!start) {
    return new Response('Missing start parameter', { status: 400 });
  }

  const ics = generateICSContent(title, start, duration, desc || undefined, url || undefined);

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar;charset=utf-8',
      'Content-Disposition': `attachment; filename="webinar.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
