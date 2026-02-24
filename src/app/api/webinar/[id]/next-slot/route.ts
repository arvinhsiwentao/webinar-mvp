import { NextRequest, NextResponse } from 'next/server';
import { getWebinarById } from '@/lib/db';
import { generateEvergreenSlots, getSlotExpiresAt } from '@/lib/evergreen';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const webinar = getWebinarById(id);

  if (!webinar) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  if (!webinar.evergreen?.enabled) {
    return NextResponse.json(
      { error: 'Evergreen not enabled for this webinar' },
      { status: 400 }
    );
  }

  const slots = generateEvergreenSlots(webinar.evergreen);
  const countdownTarget = slots[0]?.slotTime || null;
  const expiresAt = countdownTarget
    ? getSlotExpiresAt(countdownTarget, webinar.evergreen.videoDurationMinutes)
    : null;

  return NextResponse.json({
    slots,
    countdownTarget,
    expiresAt,
    config: {
      videoDurationMinutes: webinar.evergreen.videoDurationMinutes,
      timezone: webinar.evergreen.timezone,
    },
  });
}
