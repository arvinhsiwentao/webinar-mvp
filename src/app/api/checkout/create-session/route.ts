import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getWebinarById, getOrdersByEmail, createOrder } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webinarId, email, name, source } = body;

    if (!webinarId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve webinar first (handles numeric ID → UUID conversion)
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

    // Create Stripe Checkout Session in embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      locale: 'auto',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${baseUrl}/checkout/${resolvedId}/return?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: email,
      metadata: {
        webinarId: resolvedId,
        email,
        name: name || '',
        source: source || 'direct',
        order_source: 'mike_webinar',
      },
      payment_intent_data: {
        metadata: {
          order_source: 'mike_webinar',
          webinarId: resolvedId,
          email,
          name: name || '',
          source: source || 'direct',
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
      metadata: { source: source || 'direct', order_source: 'mike_webinar' },
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
