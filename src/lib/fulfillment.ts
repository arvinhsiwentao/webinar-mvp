import { getOrderBySessionId, updateOrder, updateOrderStatus, getWebinarById } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';
import { audit } from '@/lib/audit';

export interface FulfillmentResult {
  status: 'fulfilled' | 'already_fulfilled' | 'already_processing' | 'no_order' | 'failed';
  activationCode?: string;
  error?: string;
}

/**
 * Fulfill an order: claim activation code, update DB, send email.
 * Safe to call from multiple paths — atomic lock prevents double fulfillment.
 */
export async function fulfillOrder(
  stripeSessionId: string,
  paymentIntentId?: string | null
): Promise<FulfillmentResult> {
  const order = await getOrderBySessionId(stripeSessionId);

  if (!order) {
    console.error('[Fulfillment] No order found for session:', stripeSessionId);
    return { status: 'no_order' };
  }

  // Already fulfilled — return existing code
  if (order.status === 'fulfilled') {
    return { status: 'already_fulfilled', activationCode: order.activationCode };
  }

  // Atomic lock: pending → paid (only one caller wins)
  const locked = await updateOrderStatus(order.id, 'pending', 'paid');
  if (!locked) {
    return { status: 'already_processing' };
  }

  // === FULFILLMENT ===
  let code: string;
  const resolvedPaymentIntentId = paymentIntentId || '';
  try {
    code = await claimActivationCode(resolvedPaymentIntentId || order.id, order.email);

    // Load webinar to get product config
    const webinar = await getWebinarById(order.webinarId);

    const now = new Date().toISOString();
    await updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: code,
      stripePaymentIntentId: resolvedPaymentIntentId,
      paidAt: now,
      fulfilledAt: now,
      productPackageId: webinar?.productPackageId,
      salesCode: webinar?.salesCode,
    });

    audit({ type: 'order_fulfilled', orderId: order.id, activationCode: code });
    console.log(`[Fulfillment] Order fulfilled: ${order.id}, code: ${code}`);
  } catch (err) {
    // Rollback to pending so webhook retry or next poll can try again
    try {
      await updateOrder(order.id, { status: 'pending' });
    } catch (rollbackErr) {
      console.error('[Fulfillment] Rollback also failed:', rollbackErr);
    }
    audit({ type: 'order_fulfillment_failed', orderId: order.id, error: String(err) });
    console.error('[Fulfillment] Failed, rolled back to pending:', err);
    return { status: 'failed', error: String(err) };
  }

  // === NOTIFICATION (best-effort) ===
  try {
    const orderDate = new Date().toLocaleDateString('zh-CN', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).replace(/-/g, '/');

    // Check if user is eligible for 1-on-1 bonus (purchased within 2-hour window)
    let bonusEligible = false;
    const bonusDeadline = order.metadata?.bonusDeadline;
    if (bonusDeadline) {
      bonusEligible = Date.now() < parseInt(bonusDeadline, 10);
    }

    const emailParams = purchaseConfirmationEmail({
      to: order.email,
      name: order.name || order.email,
      activationCode: code,
      orderDate,
      orderId: resolvedPaymentIntentId || stripeSessionId,
      email: order.email,
      bonusEligible,
    });
    const emailSent = await sendEmail(emailParams);
    if (!emailSent) {
      console.error(`[Fulfillment] Email failed for order ${order.id} — customer must use on-screen code`);
    }
  } catch (emailErr) {
    console.error(`[Fulfillment] Email error for order ${order.id}:`, emailErr);
  }

  return { status: 'fulfilled', activationCode: code };
}
