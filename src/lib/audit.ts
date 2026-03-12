import { supabase } from './supabase';

type AuditEvent =
  | { type: 'registration_created'; webinarId: string; email: string; registrationId: string }
  | { type: 'order_created'; webinarId: string; email: string; orderId: string; amount: number }
  | { type: 'order_fulfilled'; orderId: string; activationCode: string }
  | { type: 'order_fulfillment_failed'; orderId: string; error: string }
  | { type: 'email_sent'; to: string; template: string }
  | { type: 'email_failed'; to: string; template: string; error: string }
  | { type: 'webhook_sent'; url: string; status: number }
  | { type: 'webhook_failed'; url: string; error: string };

export function audit(event: AuditEvent): void {
  // Fire and forget — audit logging should never block the request
  supabase
    .from('events')
    .insert({ data: event })
    .then(({ error }) => {
      if (error) console.error('[audit] Failed to log event:', error);
    });
}
