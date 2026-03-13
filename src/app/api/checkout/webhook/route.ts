import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder, updateOrderStatus } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
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

    // === FULFILLMENT (retryable via Stripe) ===
    let code: string;
    let paymentIntentId: string;
    try {
      paymentIntentId = session.payment_intent as string;
      code = await claimActivationCode(paymentIntentId || order.id, order.email);

      const now = new Date().toISOString();
      await updateOrder(order.id, {
        status: 'fulfilled',
        activationCode: code,
        stripePaymentIntentId: paymentIntentId,
        paidAt: now,
        fulfilledAt: now,
      });

      audit({ type: 'order_fulfilled', orderId: order.id, activationCode: code });
      console.log(`[Webhook] Order fulfilled: ${order.id}, code: ${code}`);
    } catch (err) {
      // Rollback: restore to pending so Stripe can retry
      await updateOrder(order.id, { status: 'pending' });
      audit({ type: 'order_fulfillment_failed', orderId: order.id, error: String(err) });
      console.error('[Webhook] Fulfillment failed, rolled back to pending:', err);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }

    // === NOTIFICATION (best-effort, never rolls back fulfillment) ===
    try {
      const orderDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).replace(/-/g, '/');
      const emailParams = purchaseConfirmationEmail({
        to: order.email,
        name: order.name || order.email,
        activationCode: code,
        orderDate,
        orderId: paymentIntentId || session.id,
        email: order.email,
      });
      const emailSent = await sendEmail(emailParams);
      if (!emailSent) {
        console.error(`[Webhook] Email failed for order ${order.id} — customer must use on-screen code`);
      }
    } catch (emailErr) {
      console.error(`[Webhook] Email error for order ${order.id}:`, emailErr);
    }
  }

  return NextResponse.json({ received: true });
}
