/**
 * Server-side notifications for purchase events.
 * 1. GA4 Measurement Protocol — backup for client-side tracking
 * 2. Google Chat webhook — instant team notification
 */

import { getProduct } from '@/lib/products';

interface PurchaseNotificationData {
  sessionId: string;
  email: string;
  name: string;
  amount: number; // cents
  currency: string;
  productIds: string; // comma-separated
  gaClientId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

/**
 * Send purchase event to GA4 via Measurement Protocol.
 * Deduplicates with client-side via matching transaction_id.
 */
export async function sendGA4Purchase(data: PurchaseNotificationData): Promise<boolean> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('[GA4 MP] Missing GA4_MEASUREMENT_ID or GA4_API_SECRET, skipping');
    return false;
  }

  const clientId = data.gaClientId || data.sessionId;
  const value = data.amount / 100;
  const productIdList = data.productIds.split(',').filter(Boolean);

  const items = productIdList.map(id => {
    const product = getProduct(id);
    return {
      item_id: id,
      item_name: product?.name || id,
      price: product?.price || 0,
      quantity: 1,
    };
  });

  const payload = {
    client_id: clientId,
    events: [{
      name: 'purchase',
      params: {
        transaction_id: data.sessionId,
        value,
        currency: data.currency.toUpperCase(),
        items,
        // UTM as event params for attribution
        ...(data.utmSource ? { utm_source: data.utmSource } : {}),
        ...(data.utmMedium ? { utm_medium: data.utmMedium } : {}),
        ...(data.utmCampaign ? { utm_campaign: data.utmCampaign } : {}),
        ...(data.utmContent ? { utm_content: data.utmContent } : {}),
        server_side: 'true',
      },
    }],
  };

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    console.log(`[GA4 MP] Purchase sent: ${data.sessionId}, status: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('[GA4 MP] Failed:', err);
    return false;
  }
}

/**
 * Send purchase notification to Google Chat space via webhook.
 */
export async function sendGoogleChatPurchaseNotification(data: PurchaseNotificationData): Promise<boolean> {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[Google Chat] Missing GOOGLE_CHAT_WEBHOOK_URL, skipping');
    return false;
  }

  const value = (data.amount / 100).toFixed(2);
  const productIdList = data.productIds.split(',').filter(Boolean);
  const productNames = productIdList
    .map(id => getProduct(id)?.shortName || id)
    .join(' + ');

  const utmInfo = [
    data.utmSource ? `source: ${data.utmSource}` : '',
    data.utmMedium ? `medium: ${data.utmMedium}` : '',
    data.utmCampaign ? `campaign: ${data.utmCampaign}` : '',
    data.utmContent ? `content: ${data.utmContent}` : '',
  ].filter(Boolean).join(' | ');

  const now = new Date().toLocaleString('zh-TW', { timeZone: 'America/Los_Angeles' });

  const message = {
    cards: [{
      header: {
        title: '💰 新訂單！',
        subtitle: `${data.name || data.email}`,
      },
      sections: [{
        widgets: [
          {
            keyValue: {
              topLabel: '購買人',
              content: `${data.name || '—'} (${data.email})`,
            },
          },
          {
            keyValue: {
              topLabel: '方案',
              content: productNames,
            },
          },
          {
            keyValue: {
              topLabel: '金額',
              content: `$${value} ${data.currency.toUpperCase()}`,
            },
          },
          {
            keyValue: {
              topLabel: '訂單編號',
              content: data.sessionId.substring(0, 30) + '...',
            },
          },
          ...(utmInfo ? [{
            keyValue: {
              topLabel: 'UTM 來源',
              content: utmInfo,
            },
          }] : []),
          {
            keyValue: {
              topLabel: '時間 (PT)',
              content: now,
            },
          },
        ],
      }],
    }],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    console.log(`[Google Chat] Notification sent, status: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error('[Google Chat] Failed:', err);
    return false;
  }
}

/**
 * Fire all server-side purchase notifications (best-effort, non-blocking).
 */
export async function notifyPurchase(data: PurchaseNotificationData): Promise<void> {
  await Promise.allSettled([
    sendGA4Purchase(data),
    sendGoogleChatPurchaseNotification(data),
  ]);
}
