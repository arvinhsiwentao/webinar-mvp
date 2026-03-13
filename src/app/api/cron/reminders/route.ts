import { NextResponse } from 'next/server';
import { getAllWebinars, getRegistrationsByWebinar } from '@/lib/db';
import { sendEmail, reminderEmail } from '@/lib/email';
import { buildEmailLink } from '@/lib/utils';

export async function GET() {
  const webinars = await getAllWebinars();
  let sent = 0;

  for (const webinar of webinars) {
    if (webinar.status !== 'published') continue;

    const registrations = await getRegistrationsByWebinar(webinar.id);
    for (const reg of registrations) {
      if (!reg.assignedSlot) continue;

      const startTime = new Date(reg.assignedSlot).getTime();
      const now = Date.now();
      const hoursUntil = (startTime - now) / (1000 * 60 * 60);

      let type: '24h' | '1h' | null = null;
      if (hoursUntil > 23 && hoursUntil <= 25) type = '24h';
      if (hoursUntil > 0.5 && hoursUntil <= 1.5) type = '1h';

      if (!type) continue;

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const liveUrl = buildEmailLink(
        baseUrl,
        `/webinar/${webinar.id}/lobby`,
        { name: reg.name, email: reg.email, slot: reg.assignedSlot },
        type === '24h' ? 'reminder_24h' : 'reminder_1h',
        { utmSource: reg.utmSource, utmMedium: reg.utmMedium, utmCampaign: reg.utmCampaign, utmContent: reg.utmContent, gclid: reg.gclid }
      );
      const emailData = reminderEmail(reg.email, type, reg.name, webinar.title, liveUrl);
      await sendEmail(emailData);
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
