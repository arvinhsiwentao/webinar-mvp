import { NextRequest, NextResponse } from 'next/server';
import { getWebinarById, updateRegistration } from '@/lib/db';
import { generateEvergreenSlots, getSlotExpiresAt } from '@/lib/evergreen';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { registrationId } = body;

  if (!registrationId) {
    return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 });
  }

  const webinar = getWebinarById(id);
  if (!webinar || !webinar.evergreen?.enabled) {
    return NextResponse.json({ error: 'Webinar not found or evergreen not enabled' }, { status: 404 });
  }

  const slots = generateEvergreenSlots(webinar.evergreen);
  if (slots.length === 0) {
    return NextResponse.json({ error: 'No available slots' }, { status: 500 });
  }

  const newSlot = slots[0].slotTime;
  const expiresAt = getSlotExpiresAt(newSlot, webinar.evergreen.videoDurationMinutes);

  const updated = updateRegistration(registrationId, {
    assignedSlot: newSlot,
    slotExpiresAt: expiresAt,
    reassignedFrom: body.previousSlot || undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
  }

  return NextResponse.json({ newSlot, expiresAt, registration: updated });
}
