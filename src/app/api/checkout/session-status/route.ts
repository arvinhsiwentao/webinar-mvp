import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId } from '@/lib/db';
import { fulfillOrder } from '@/lib/fulfillment';
import { getProduct } from '@/lib/products';

type PurchaseItem = { item_id: string; item_name: string; price: number; quantity: number };

/** Build GA4-shaped items[] from a comma-joined productIds string. */
function buildPurchaseItems(productIdsStr: string | undefined | null): PurchaseItem[] {
  if (!productIdsStr) return [];
  return productIdsStr
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(id => {
      const product = getProduct(id);
      return {
        item_id: id,
        item_name: product?.name || id,
        price: product?.price || 0,
        quantity: 1,
      };
    });
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === 'complete') {
      let order = await getOrderBySessionId(sessionId);

      // Inline fulfillment fallback: if payment complete but order not yet fulfilled,
      // attempt fulfillment directly (safe — atomic lock prevents doubles)
      if (order && order.status === 'pending') {
        const paymentIntentId = (session.payment_intent as string | null) ?? undefined;
        const result = await fulfillOrder(sessionId, paymentIntentId);

        if (result.status === 'fulfilled') {
          // Re-read order to get the activation code
          order = await getOrderBySessionId(sessionId);
        }
        // If failed or already_processing, return current state — next poll will retry
      }

      if (order) {
        // Build product-code pairs for multi-product orders
        const productIdsStr = order.metadata?.productIds || '';
        const productNamesStr = order.metadata?.productNames || '';
        const productIds = productIdsStr ? productIdsStr.split(',') : [];
        const productNames = productNamesStr ? productNamesStr.split(',') : [];
        const codes = order.activationCode ? order.activationCode.split(',') : [];

        const activationCodes = codes.map((code, i) => ({
          productId: productIds[i] || '',
          productName: productNames[i] || '',
          code: code.trim(),
        }));

        return NextResponse.json({
          status: session.status,
          orderStatus: order.status,
          activationCode: order.status === 'fulfilled' ? order.activationCode : undefined,
          activationCodes: order.status === 'fulfilled' ? activationCodes : undefined,
          customerEmail: session.customer_details?.email || session.customer_email,
          amountTotal: session.amount_total,
          currency: session.currency,
          productName: productNames.join(' + ') || session.metadata?.webinar_title || 'Webinar Course',
          items: buildPurchaseItems(productIdsStr),
        });
      }
    }

    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      productName: session.metadata?.webinar_title || 'Webinar Course',
      items: buildPurchaseItems(session.metadata?.productIds),
    });
  } catch (err) {
    console.error('[Checkout] Session status check failed:', err);
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 },
    );
  }
}
