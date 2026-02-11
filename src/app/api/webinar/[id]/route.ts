import { NextRequest, NextResponse } from 'next/server';
import { getWebinarById, initializeSampleData } from '@/lib/db';

// Initialize sample data
let initialized = false;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!initialized) {
    initializeSampleData();
    initialized = true;
  }

  const { id } = await params;
  const webinar = getWebinarById(id);

  if (!webinar) {
    return NextResponse.json(
      { error: 'Webinar not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ webinar });
}
