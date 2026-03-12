import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder, updateOrderStatus } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
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

    // Atomic lock: set status to 'paid' only if still 'pending'
    // Prevents double fulfillment if Stripe retries the webhook
    const locked = await updateOrderStatus(order.id, 'pending', 'paid');
    if (!locked) {
      console.log('[Webhook] Order already being processed:', order.id);
      return NextResponse.json({ received: true });
    }

    try {
      const paymentIntentId = session.payment_intent as string;
      const code = await claimActivationCode(paymentIntentId || order.id, order.email);

      const now = new Date().toISOString();
      await updateOrder(order.id, {
        status: 'fulfilled',
        activationCode: code,
        stripePaymentIntentId: paymentIntentId,
        paidAt: now,
        fulfilledAt: now,
      });

      // Send purchase confirmation email
      const orderDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/');
      const emailParams = purchaseConfirmationEmail({
        to: order.email,
        name: order.name || order.email,
        activationCode: code,
        orderDate,
        orderId: paymentIntentId || session.id,
        email: order.email,
      });
      await sendEmail(emailParams);

      console.log(`[Webhook] Order fulfilled: ${order.id}, code: ${code}`);
    } catch (err) {
      // Rollback: restore to pending so it can be retried
      await updateOrder(order.id, { status: 'pending' });
      console.error('[Webhook] Fulfillment failed, rolled back to pending:', err);
      // Return 500 so Stripe retries this webhook
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
