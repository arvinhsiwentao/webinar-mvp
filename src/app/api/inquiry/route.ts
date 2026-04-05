import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webinarId, name, whatsapp, question, pageSource } = body;

    if (!whatsapp || !question) {
      return NextResponse.json(
        { error: '请填写 WhatsApp 和问题' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('chatbot_inquiries').insert({
      webinar_id: webinarId || null,
      name: name || '',
      whatsapp,
      question,
      page_source: pageSource || 'unknown',
    });

    if (error) {
      console.error('Failed to save inquiry:', error);
      return NextResponse.json(
        { error: 'Failed to save inquiry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
