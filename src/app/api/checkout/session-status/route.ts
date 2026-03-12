import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === 'complete') {
      const order = await getOrderBySessionId(sessionId);
      if (order) {
        return NextResponse.json({
          status: session.status,
          orderStatus: order.status,
          activationCode: order.status === 'fulfilled' ? order.activationCode : undefined,
          customerEmail: session.customer_details?.email || session.customer_email,
          amountTotal: session.amount_total,
          currency: session.currency,
          productName: session.metadata?.webinar_title || 'Webinar Course',
        });
      }
    }

    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      productName: session.metadata?.webinar_title || 'Webinar Course',
    });
  } catch (err) {
    console.error('[Checkout] Session status check failed:', err);
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 },
    );
  }
}
