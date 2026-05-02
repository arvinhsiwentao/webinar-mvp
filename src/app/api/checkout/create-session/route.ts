import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getWebinarById, getOrdersByEmail, createOrder } from '@/lib/db';
import { getProduct, PRODUCT_IDS, type ProductId } from '@/lib/products';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webinarId, email, name, source, bonusDeadline, productIds, gaClientId, utm } = body;

    if (!webinarId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate productIds
    const ids: ProductId[] = productIds || [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 });
    }

    // Resolve products and build line_items
    const lineItems: { price: string; quantity: number }[] = [];
    const productNames: string[] = [];
    for (const id of ids) {
      const product = getProduct(id);
      if (!product) {
        return NextResponse.json({ error: `Invalid product: ${id}` }, { status: 400 });
      }
      lineItems.push({ price: product.stripePriceId, quantity: 1 });
      productNames.push(product.shortName);
    }

    // Resolve webinar (handles numeric ID → UUID conversion)
    const webinar = await getWebinarById(webinarId);
    if (!webinar) {
      return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
    }

    const resolvedId = webinar.id;

    // Check for existing purchase (using resolved UUID)
    const existingOrders = await getOrdersByEmail(email, resolvedId);
    const alreadyPurchased = existingOrders.find(
      o => o.status === 'paid' || o.status === 'fulfilled'
    );
    if (alreadyPurchased) {
      return NextResponse.json(
        { error: 'already_purchased', message: '你已购买过此课程' },
        { status: 409 }
      );
    }

    const host = request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (host ? `${proto}://${host}` : 'https://mike.cmoney.cc');

    const isBundle = ids.includes(PRODUCT_IDS.BUNDLE);

    // Create Stripe Checkout Session in embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      locale: 'auto',
      line_items: lineItems,
      mode: 'payment',
      return_url: `${baseUrl}/checkout/${resolvedId}/return?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: email,
      metadata: {
        webinarId: resolvedId,
        email,
        name: name || '',
        source: source || 'direct',
        order_source: 'mike_webinar',
        productIds: ids.join(','),
        ga_client_id: gaClientId || '',
        utm_source: utm?.utm_source || '',
        utm_medium: utm?.utm_medium || '',
        utm_campaign: utm?.utm_campaign || '',
        utm_content: utm?.utm_content || '',
      },
      payment_intent_data: {
        metadata: {
          order_source: 'mike_webinar',
          webinarId: resolvedId,
          email,
          name: name || '',
          source: source || 'direct',
          productIds: ids.join(','),
        },
      },
    });

    // Create pending order
    await createOrder({
      webinarId: resolvedId,
      email,
      name: name || '',
      stripeSessionId: session.id,
      status: 'pending',
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      metadata: {
        source: source || 'direct',
        order_source: 'mike_webinar',
        productIds: ids.join(','),
        productNames: productNames.join(','),
        ...(isBundle && bonusDeadline ? { bonusDeadline } : {}),
      },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[Checkout] Session creation failed:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
