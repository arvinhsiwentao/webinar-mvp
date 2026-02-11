import { NextRequest, NextResponse } from 'next/server';
import { createRegistration, getRegistrationByEmail, getWebinarById } from '@/lib/db';
import { RegisterRequest } from '@/lib/types';
import { validateEmail } from '@/lib/utils';
import { sendEmail, confirmationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    if (!body.webinarId || !body.sessionId || !body.name || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: webinarId, sessionId, name, email' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if webinar exists
    const webinar = getWebinarById(body.webinarId);
    if (!webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Check if session exists
    const session = webinar.sessions.find((s) => s.id === body.sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if already registered
    const existingReg = getRegistrationByEmail(body.webinarId, body.email);
    if (existingReg) {
      return NextResponse.json(
        { error: 'This email is already registered for this webinar', registration: existingReg },
        { status: 409 }
      );
    }

    // Create registration
    const registration = createRegistration({
      webinarId: body.webinarId,
      sessionId: body.sessionId,
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

    // Send confirmation email (fire and forget)
    const origin = request.nextUrl.origin;
    const liveUrl = `${origin}/webinar/${body.webinarId}/waiting?session=${body.sessionId}&name=${encodeURIComponent(body.name)}`;
    const emailData = confirmationEmail(body.name, webinar.title, session!.startTime, liveUrl);
    sendEmail({ ...emailData, to: body.email }); // fire and forget, don't await

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}
