import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages, addChatMessage, getWebinarById } from '@/lib/db';
import { chatBroker } from '@/lib/chat-broker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  const webinar = getWebinarById(id);
  if (!webinar) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  const messages = getChatMessages(id, sessionId);
  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { sessionId, name, message, timestamp } = body;

    if (!sessionId || !name || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, name, message' },
        { status: 400 }
      );
    }

    const webinar = getWebinarById(id);
    if (!webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      );
    }

    const newMessage = addChatMessage({
      webinarId: id,
      sessionId,
      name,
      message,
      timestamp: timestamp || 0,
    });

    const channel = `webinar-${id}`;
    chatBroker.publish(channel, JSON.stringify({
      type: 'message',
      message: newMessage,
    }));

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error adding chat message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}
