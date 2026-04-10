import { getOrderBySessionId, updateOrder, updateOrderStatus, getWebinarById } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
import { getProduct, PRODUCT_IDS, type ProductId } from '@/lib/products';

export interface FulfillmentResult {
  status: 'fulfilled' | 'already_fulfilled' | 'already_processing' | 'no_order' | 'failed';
  activationCode?: string;
  /** Multiple codes when multiple products purchased */
  activationCodes?: { productId: string; productName: string; code: string }[];
  error?: string;
}

/**
 * Fulfill an order: claim activation code(s), update DB, send email.
 * Supports single product (legacy) and multi-product orders.
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

  // Already fulfilled — return existing code(s)
  if (order.status === 'fulfilled') {
    return { status: 'already_fulfilled', activationCode: order.activationCode };
  }

  // Atomic lock: pending → paid (only one caller wins)
  const locked = await updateOrderStatus(order.id, 'pending', 'paid');
  if (!locked) {
    return { status: 'already_processing' };
  }

  // === FULFILLMENT ===
  const resolvedPaymentIntentId = paymentIntentId || '';
  const activationCodes: { productId: string; productName: string; code: string }[] = [];

  try {
    // Determine which products were purchased
    const productIdsStr = order.metadata?.productIds;
    const productIds: ProductId[] = productIdsStr
      ? productIdsStr.split(',') as ProductId[]
      : []; // legacy orders without productIds

    if (productIds.length > 0) {
      // Multi-product: claim a code from each product's sheet
      for (const pid of productIds) {
        const product = getProduct(pid);
        if (!product) {
          console.warn(`[Fulfillment] Unknown product ID: ${pid}, skipping`);
          continue;
        }
        const code = await claimActivationCode(
          resolvedPaymentIntentId || order.id,
          order.email,
          product.sheetName
        );
        activationCodes.push({
          productId: pid,
          productName: product.name,
          code,
        });
      }
    } else {
      // Legacy single-product: claim from default sheet
      const code = await claimActivationCode(
        resolvedPaymentIntentId || order.id,
        order.email
      );
      activationCodes.push({
        productId: 'bundle',
        productName: '美股二加一实战组合包',
        code,
      });
    }

    if (activationCodes.length === 0) {
      throw new Error('No activation codes claimed');
    }

    // Load webinar (kept for backward compat / legacy orders)
    const webinar = await getWebinarById(order.webinarId);

    // Store all codes as comma-separated (primary code = first one)
    const allCodes = activationCodes.map(c => c.code).join(',');

    // Build per-product fulfillment fields from products.ts
    // For multi-product orders, join with comma so all products are tracked
    const fulfilledProducts = activationCodes
      .map(c => getProduct(c.productId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
    const productPackageIds = fulfilledProducts.map(p => p.productPackageId).join(',');
    const salesCodes = fulfilledProducts.map(p => p.salesCode).join(',');

    const now = new Date().toISOString();
    await updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: allCodes,
      stripePaymentIntentId: resolvedPaymentIntentId,
      paidAt: now,
      fulfilledAt: now,
      // Use per-product values if available, fall back to webinar level for legacy orders
      productPackageId: productPackageIds || webinar?.productPackageId,
      salesCode: salesCodes || webinar?.salesCode,
    });

    audit({
      type: 'order_fulfilled',
      orderId: order.id,
      activationCode: allCodes,
    });
    console.log(`[Fulfillment] Order fulfilled: ${order.id}, codes: ${allCodes}`);
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

    // Check if user is eligible for 1-on-1 bonus (bundle + purchased within 2-hour window)
    const productIdsStr = order.metadata?.productIds || '';
    const isBundle = productIdsStr.includes(PRODUCT_IDS.BUNDLE);
    let bonusEligible = false;
    const bonusDeadline = order.metadata?.bonusDeadline;
    if (isBundle && bonusDeadline) {
      bonusEligible = Date.now() < parseInt(bonusDeadline, 10);
    }

    const emailParams = purchaseConfirmationEmail({
      to: order.email,
      name: order.name || order.email,
      activationCodes,
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

  return { status: 'fulfilled', activationCode: activationCodes[0]?.code, activationCodes };
}
