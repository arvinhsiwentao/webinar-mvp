import { NextRequest, NextResponse } from 'next/server';
import { getWebinarById, updateWebinar, deleteWebinar, getRegistrationsByWebinar } from '@/lib/db';
import { AutoChatMessage, CTAEvent } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const webinar = await getWebinarById(id);

  if (!webinar) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  const registrations = await getRegistrationsByWebinar(id);
  return NextResponse.json({ webinar, registrations });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Ensure autoChat and ctaEvents have IDs (like POST does)
    if (body.autoChat) {
      body.autoChat = body.autoChat.map((m: Partial<AutoChatMessage>) => ({
        ...m,
        id: m.id || crypto.randomUUID(),
      }));
    }
    if (body.ctaEvents) {
      body.ctaEvents = body.ctaEvents.map((c: Partial<CTAEvent>) => ({
        ...c,
        id: c.id || crypto.randomUUID(),
      }));
    }

    const webinar = await updateWebinar(id, body);

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
  const deleted = await deleteWebinar(id);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
