import { NextRequest, NextResponse } from 'next/server';
import { createRegistration, getRegistrationByEmail, getWebinarById } from '@/lib/db';
import { RegisterRequest } from '@/lib/types';
import { validateEmail, buildEmailLink } from '@/lib/utils';
import { sendEmail, confirmationEmail } from '@/lib/email';
import { getSlotExpiresAt } from '@/lib/evergreen';
import { audit } from '@/lib/audit';

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
    const webinar = await getWebinarById(body.webinarId);
    if (!webinar) {
      return NextResponse.json(
        { error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Use the resolved UUID from the database, not the raw input (which may be a numeric alias)
    const resolvedWebinarId = webinar.id;

    // Check if already registered
    const existingReg = await getRegistrationByEmail(resolvedWebinarId, body.email);
    if (existingReg) {
      return NextResponse.json(
        { error: 'This email is already registered for this webinar', registration: existingReg },
        { status: 409 }
      );
    }

    // Create registration
    const registrationData: Record<string, unknown> = {
      webinarId: resolvedWebinarId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      gclid: body.gclid,
    };

    // Add evergreen slot info
    if (body.assignedSlot && webinar.evergreen) {
      registrationData.assignedSlot = body.assignedSlot;
      registrationData.slotExpiresAt = getSlotExpiresAt(
        body.assignedSlot,
        webinar.evergreen.videoDurationMinutes
      );
    }

    let registration;
    try {
      registration = await createRegistration(registrationData as Parameters<typeof createRegistration>[0]);
    } catch (err: unknown) {
      // Supabase returns code '23505' for unique constraint violations
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        const existingReg = await getRegistrationByEmail(resolvedWebinarId, body.email);
        return NextResponse.json(
          { error: 'This email is already registered for this webinar', registration: existingReg },
          { status: 409 }
        );
      }
      throw err; // Re-throw other errors
    }

    audit({ type: 'registration_created', webinarId: resolvedWebinarId, email: body.email, registrationId: registration.id });

    // Send confirmation email (fire and forget)
    const host = request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : request.nextUrl.origin);
    const liveUrl = buildEmailLink(
      baseUrl,
      `/webinar/${resolvedWebinarId}/lobby`,
      {
        name: body.name,
        email: body.email,
        ...(body.assignedSlot ? { slot: body.assignedSlot } : {}),
      },
      'confirmation',
      { utmSource: body.utmSource, utmMedium: body.utmMedium, utmCampaign: body.utmCampaign, utmContent: body.utmContent, gclid: body.gclid }
    );
    const sessionStartTime = body.assignedSlot;
    if (sessionStartTime) {
      const avatarPath = webinar.speakerAvatar || webinar.speakerImage;
      const speakerAvatarUrl = avatarPath ? `${baseUrl}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}` : undefined;
      const emailData = confirmationEmail(body.email, body.name, webinar.title, sessionStartTime, liveUrl, speakerAvatarUrl, webinar.evergreen?.timezone);
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
      })
        .then(res => audit({ type: 'webhook_sent', url: webinar.webhookUrl!, status: res.status }))
        .catch(err => audit({ type: 'webhook_failed', url: webinar.webhookUrl!, error: String(err) }));
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
