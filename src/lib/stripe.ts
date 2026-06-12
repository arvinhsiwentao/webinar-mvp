import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set — Stripe calls will fail');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

/**
 * Isolated Stripe instance for the us-stock-course funnel (sandbox/test while testing).
 * Lets the $1 funnel run on its own keys WITHOUT touching the live STRIPE_SECRET_KEY.
 * When STRIPE_US_STOCK_SECRET_KEY is unset, everything falls back to the live `stripe`.
 */
const usStockSecret = process.env.STRIPE_US_STOCK_SECRET_KEY;
const usStockStripe = usStockSecret
  ? new Stripe(usStockSecret, { typescript: true })
  : null;

/** Stripe client for a funnel — us_stock_course uses its own key if configured. */
export function getStripeForFunnel(funnel?: string): Stripe {
  if (funnel === 'us_stock_course' && usStockStripe) return usStockStripe;
  return stripe;
}

/** Stripe client matching a session id's mode (cs_test_ → us-stock sandbox if configured). */
export function getStripeForSessionId(sessionId: string): Stripe {
  if (sessionId.startsWith('cs_test_') && usStockStripe) return usStockStripe;
  return stripe;
}
