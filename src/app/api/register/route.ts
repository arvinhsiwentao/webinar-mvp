import { NextRequest, NextResponse } from 'next/server';
import { createRegistration, getRegistrationByEmail, getWebinarById } from '@/lib/db';
import { RegisterRequest } from '@/lib/types';
import { validateEmail } from '@/lib/utils';
import { sendEmail, confirmationEmail } from '@/lib/email';
import { getSlotExpiresAt } from '@/lib/evergreen';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    const missing = [
      !body.webinarId && 'webinarId',
      !body.name && 'name',
      !body.email && 'email',
    ].filter(Boolean);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
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

    // Check if already registered
    const existingReg = getRegistrationByEmail(body.webinarId, body.email);
    if (existingReg) {
      return NextResponse.json(
        { error: 'This email is already registered for this webinar', registration: existingReg },
        { status: 409 }
      );
    }

    // Create registration
    const registrationData: Record<string, unknown> = {
      webinarId: body.webinarId,
      name: body.name,
      email: body.email,
      phone: body.phone,
    };

    // Add evergreen slot info
    if (body.assignedSlot && webinar.evergreen) {
      registrationData.assignedSlot = body.assignedSlot;
      registrationData.slotExpiresAt = getSlotExpiresAt(
        body.assignedSlot,
        webinar.evergreen.videoDurationMinutes
      );
    }

    const registration = createRegistration(registrationData as Parameters<typeof createRegistration>[0]);

    // Send confirmation email (fire and forget)
    const origin = request.nextUrl.origin;
    const liveUrl = `${origin}/webinar/${body.webinarId}/lobby?name=${encodeURIComponent(body.name)}`;
    const sessionStartTime = body.assignedSlot;
    if (sessionStartTime) {
      const emailData = confirmationEmail(body.email, body.name, webinar.title, sessionStartTime, liveUrl);
      sendEmail(emailData);
    }

    // Fire webhook if configured
    if (webinar.webhookUrl) {
      fetch(webinar.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'registration',
          webinar: { id: webinar.id, title: webinar.title },
          registration: {
            name: body.name,
            email: body.email,
            phone: body.phone,
            registeredAt: new Date().toISOString(),
          },
        }),
      }).catch(() => { /* silent fail */ });
    }

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}
