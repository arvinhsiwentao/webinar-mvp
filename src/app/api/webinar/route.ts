import { NextResponse } from 'next/server';
import { getAllWebinars } from '@/lib/db';

export async function GET() {
  const webinars = await getAllWebinars();
  return NextResponse.json({ webinars });
}
