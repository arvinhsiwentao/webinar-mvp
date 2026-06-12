/**
 * List orders attached to the us-stock container webinar (to debug "already purchased").
 * Run: npx tsx scripts/list-us-stock-orders.ts
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { supabase } = await import('../src/lib/supabase');
  const containerId = process.env.US_STOCK_CONTAINER_WEBINAR_ID || '147249ab-97d6-4f6c-9043-88ebcc10834c';

  const { data, error } = await supabase
    .from('orders')
    .select('id, email, status, amount, currency, activation_code, created_at')
    .eq('webinar_id', containerId)
    .order('created_at', { ascending: false });

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  console.log(`Container webinar: ${containerId}`);
  console.log(`Orders: ${data?.length ?? 0}\n`);
  for (const o of data ?? []) {
    const blocks = o.status === 'paid' || o.status === 'fulfilled';
    console.log(`${blocks ? '🔴' : '⚪'} ${o.status.padEnd(9)} ${o.email.padEnd(36)} ${o.created_at}  ${o.activation_code ? `codes=${o.activation_code}` : ''}`);
  }
  console.log('\n🔴 = blocks re-purchase (status paid/fulfilled)');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
