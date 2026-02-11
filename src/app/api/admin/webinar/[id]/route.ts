import { NextRequest, NextResponse } from 'next/server';
import { getWebinarById, updateWebinar, deleteWebinar, generateId, initializeSampleData, getRegistrationsByWebinar } from '@/lib/db';
import { Session, AutoChatMessage, CTAEvent } from '@/lib/types';

// Initialize sample data
let initialized = false;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!initialized) {
    initializeSampleData();
    initialized = true;
  }

  const { id } = await params;
  const webinar = getWebinarById(id);

  if (!webinar) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  const registrations = getRegistrationsByWebinar(id);
  return NextResponse.json({ webinar, registrations });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Ensure sessions, autoChat, and ctaEvents have IDs (like POST does)
    if (body.sessions) {
      body.sessions = body.sessions.map((s: Partial<Session>) => ({
        ...s,
        id: s.id || generateId(),
        status: s.status || 'scheduled',
      }));
    }
    if (body.autoChat) {
      body.autoChat = body.autoChat.map((m: Partial<AutoChatMessage>) => ({
        ...m,
        id: m.id || generateId(),
      }));
    }
    if (body.ctaEvents) {
      body.ctaEvents = body.ctaEvents.map((c: Partial<CTAEvent>) => ({
        ...c,
        id: c.id || generateId(),
      }));
    }

    const webinar = updateWebinar(id, body);

    if (!webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ webinar });
  } catch (error) {
    console.error('Error updating webinar:', error);
    return NextResponse.json(
      { error: 'Failed to update webinar' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteWebinar(id);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
