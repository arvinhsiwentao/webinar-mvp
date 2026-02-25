import { NextResponse } from 'next/server';
import { getAllWebinars, getRegistrationsByWebinar } from '@/lib/db';
import { sendEmail, reminderEmail } from '@/lib/email';

export async function GET() {
  const webinars = getAllWebinars();
  let sent = 0;

  for (const webinar of webinars) {
    if (webinar.status !== 'published') continue;

    const registrations = getRegistrationsByWebinar(webinar.id);
    for (const reg of registrations) {
      if (!reg.assignedSlot) continue;

      const startTime = new Date(reg.assignedSlot).getTime();
      const now = Date.now();
      const hoursUntil = (startTime - now) / (1000 * 60 * 60);

      let type: '24h' | '1h' | null = null;
      if (hoursUntil > 23 && hoursUntil <= 25) type = '24h';
      if (hoursUntil > 0.5 && hoursUntil <= 1.5) type = '1h';

      if (!type) continue;

      const liveUrl = `/webinar/${webinar.id}/lobby?name=${encodeURIComponent(reg.name)}&slot=${encodeURIComponent(reg.assignedSlot)}`;
      const emailData = reminderEmail(reg.email, type, reg.name, webinar.title, liveUrl);
      await sendEmail(emailData);
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
