import { NextRequest, NextResponse } from 'next/server';
import { createWebinar, getAllWebinars, generateId, initializeSampleData } from '@/lib/db';
import { CreateWebinarRequest, Session, AutoChatMessage, CTAEvent } from '@/lib/types';

// Initialize sample data on first request
let initialized = false;

export async function GET() {
  if (!initialized) {
    initializeSampleData();
    initialized = true;
  }
  
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

    // Process sessions with IDs
    const sessions: Session[] = (body.sessions || []).map((s) => ({
      ...s,
      id: generateId(),
      status: 'scheduled' as const,
    }));

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
      title: body.title,
      subtitle: body.subtitle,
      speakerName: body.speakerName,
      speakerTitle: body.speakerTitle,
      speakerBio: body.speakerBio,
      speakerImage: body.speakerImage,
      videoUrl: body.videoUrl,
      thumbnailUrl: body.thumbnailUrl,
      duration: body.duration || 60,
      highlights: body.highlights || [],
      sessions,
      autoChat,
      ctaEvents,
      status: 'draft',
      viewerBaseCount: body.viewerBaseCount ?? 100,
      viewerMultiplier: body.viewerMultiplier ?? 1.5,
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
