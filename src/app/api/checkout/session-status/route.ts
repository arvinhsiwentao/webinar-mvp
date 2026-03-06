import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder, getOrderByActivationCode } from '@/lib/db';
import { generateActivationCode } from '@/lib/activation-codes';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // If payment completed, ensure fulfillment as backup (webhook is primary)
    if (session.status === 'complete') {
      const order = await getOrderBySessionId(sessionId);
      if (order && order.status !== 'fulfilled') {
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

        // Send email
        const emailParams = purchaseConfirmationEmail(
          order.email,
          order.name || order.email,
          code,
        );
        await sendEmail(emailParams);
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
