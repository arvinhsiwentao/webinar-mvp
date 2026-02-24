import { NextResponse } from 'next/server';

// TODO: Implement evergreen-aware reminders.
// Evergreen slots are computed dynamically (not stored), so reminders need to:
// 1. Query registrations with upcoming assignedSlot times
// 2. Send reminders based on (assignedSlot - now) thresholds
// This requires querying registrations by assignedSlot range, not iterating sessions.
export async function GET() {
  return NextResponse.json({
    sent: 0,
    message: 'Evergreen reminders not yet implemented',
  });
}
