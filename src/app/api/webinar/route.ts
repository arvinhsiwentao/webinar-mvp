import { NextResponse } from 'next/server';
import { getAllWebinars, initializeSampleData } from '@/lib/db';

// Initialize sample data on first request
let initialized = false;

export async function GET() {
  if (!initialized) {
    initializeSampleData();
    initialized = true;
  }

  const webinars = getAllWebinars();
  return NextResponse.json({ webinars });
}
