/**
 * Look up the price(s) for a Stripe product. Read-only.
 * Run: npx tsx scripts/check-stripe-product.ts prod_XXXX
 */
import { readFileSync } from 'fs';
import Stripe from 'stripe';

const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.startsWith('#')) continue;
  const key = line.slice(0, eqIdx).trim();
  const val = line.slice(eqIdx + 1).trim();
  if (key && !key.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY')) process.env[key] = val;
}

const productId = process.argv[2] || 'prod_UghAD8vcugFhRx';

async function main() {
  const sk = process.env.STRIPE_US_STOCK_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!sk) { console.error('STRIPE_SECRET_KEY missing'); process.exit(1); }
  console.log(`Mode: ${sk.startsWith('sk_live') ? 'LIVE' : 'TEST'}`);
  const stripe = new Stripe(sk);

  const product = await stripe.products.retrieve(productId);
  console.log(`\nProduct: ${product.id}`);
  console.log(`  name:   ${product.name}`);
  console.log(`  active: ${product.active}`);
  console.log(`  default_price: ${product.default_price ?? '(none)'}`);

  const prices = await stripe.prices.list({ product: productId, limit: 20 });
  console.log(`\nPrices (${prices.data.length}):`);
  for (const p of prices.data) {
    const amt = p.unit_amount != null ? `${p.unit_amount / 100} ${p.currency.toUpperCase()}` : `${p.currency} (custom)`;
    console.log(`  ${p.id}  ${amt}  type=${p.type}  active=${p.active}${p.recurring ? `  recurring/${p.recurring.interval}` : '  one_time'}`);
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
