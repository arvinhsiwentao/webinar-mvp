import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fulfillOrder } from '@/lib/fulfillment';
import { sendGoogleChatPurchaseNotification } from '@/lib/server-notifications';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentIntentId = (session.payment_intent as string | null) ?? undefined;

    const result = await fulfillOrder(session.id, paymentIntentId);

    if (result.status === 'failed') {
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }

    console.log(`[Webhook] fulfillOrder result: ${result.status}`);

    // Google Chat notification (best-effort, non-blocking)
    if (result.status === 'fulfilled') {
      const meta = session.metadata || {};
      sendGoogleChatPurchaseNotification({
        sessionId: session.id,
        email: session.customer_email || meta.email || '',
        name: meta.name || '',
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        productIds: meta.productIds || '',
        utmSource: meta.utm_source || undefined,
        utmMedium: meta.utm_medium || undefined,
        utmCampaign: meta.utm_campaign || undefined,
        utmContent: meta.utm_content || undefined,
      }).catch(err => console.error('[Webhook] Chat notification error:', err));
    }
  }

  return NextResponse.json({ received: true });
}
