import { NextRequest, NextResponse } from 'next/server';
import { getAllWebinars, createWebinar, generateId } from '@/lib/db';
import { CreateWebinarRequest, AutoChatMessage, CTAEvent } from '@/lib/types';

export async function GET() {
  const webinars = getAllWebinars();
  return NextResponse.json({ webinars });
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateWebinarRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.speakerName || !body.videoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, speakerName, videoUrl' },
        { status: 400 }
      );
    }

    // Process auto chat messages with IDs
    const autoChat: AutoChatMessage[] = (body.autoChat || []).map((m) => ({
      ...m,
      id: generateId(),
    }));

    // Process CTA events with IDs
    const ctaEvents: CTAEvent[] = (body.ctaEvents || []).map((c) => ({
      ...c,
      id: generateId(),
    }));

    const webinar = createWebinar({
      ...body,
      autoChat,
      ctaEvents,
      duration: body.duration || 60,
      highlights: body.highlights || [],
      status: body.status || 'draft',
      viewerBaseCount: body.viewerBaseCount ?? 100,
      viewerMultiplier: body.viewerMultiplier ?? 1.5,
      viewerPeakTarget: body.viewerPeakTarget ?? 60,
      viewerRampMinutes: body.viewerRampMinutes ?? 15,
    });

    return NextResponse.json({ webinar }, { status: 201 });
  } catch (error) {
    console.error('Error creating webinar:', error);
    return NextResponse.json(
      { error: 'Failed to create webinar' },
      { status: 500 }
    );
  }
}
