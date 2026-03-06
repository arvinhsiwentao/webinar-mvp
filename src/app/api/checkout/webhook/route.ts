import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder, getOrderByActivationCode } from '@/lib/db';
import { generateActivationCode } from '@/lib/activation-codes';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    // IMPORTANT: Use raw text body for signature verification
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
    const order = await getOrderBySessionId(session.id);

    if (!order) {
      console.error('[Webhook] No order found for session:', session.id);
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already fulfilled
    if (order.status === 'fulfilled') {
      console.log('[Webhook] Order already fulfilled:', order.id);
      return NextResponse.json({ received: true });
    }

    // Generate unique activation code
    let code = generateActivationCode();
    while (await getOrderByActivationCode(code)) {
      code = generateActivationCode();
    }

    const now = new Date().toISOString();
    await updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: code,
      stripePaymentIntentId: session.payment_intent as string,
      paidAt: now,
      fulfilledAt: now,
    });

    // Send purchase confirmation email
    const emailParams = purchaseConfirmationEmail(
      order.email,
      order.name || order.email,
      code,
    );
    await sendEmail(emailParams);

    console.log(`[Webhook] Order fulfilled: ${order.id}, code: ${code}`);
  }

  return NextResponse.json({ received: true });
}
