import { supabase } from './supabase';
import { Webinar, Registration, ChatMessageData, Order, VideoFile, PostWebinarEmailRecipient } from './types';
import { appendRetargetingRowToSheet } from './google-sheets';

// --- Column name mapping ---
// Supabase uses snake_case, TypeScript uses camelCase

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeToCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamelKey(key)] = value;
  }
  return result as T;
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnakeKey(key)] = value;
  }
  return result;
}

// --- Webinar operations ---

export async function getAllWebinars(): Promise<Webinar[]> {
  const { data, error } = await supabase
    .from('webinars')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<Webinar>(row));
}

export async function getWebinarById(id: string): Promise<Webinar | null> {
  // Check if id looks like a UUID before querying by id column
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) {
    const { data: byId } = await supabase
      .from('webinars')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (byId) return snakeToCamel<Webinar>(byId);
  }

  // Numeric ID fallback (1-based index for legacy URLs)
  const numericId = parseInt(id, 10);
  if (!isNaN(numericId) && numericId >= 1) {
    const { data } = await supabase
      .from('webinars')
      .select('*')
      .order('created_at', { ascending: true })
      .range(numericId - 1, numericId - 1)
      .maybeSingle();
    if (data) return snakeToCamel<Webinar>(data);
  }

  return null;
}

export async function createWebinar(
  webinar: Omit<Webinar, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Webinar> {
  const row = camelToSnake(webinar as unknown as Record<string, unknown>);
  // Remove id/createdAt/updatedAt — DB generates these
  delete row.id;
  delete row.created_at;
  delete row.updated_at;

  const { data, error } = await supabase
    .from('webinars')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel<Webinar>(data);
}

export async function updateWebinar(
  id: string, updates: Partial<Webinar>
): Promise<Webinar | null> {
  const row = camelToSnake(updates as unknown as Record<string, unknown>);
  // Don't overwrite server-managed fields
  delete row.id;
  delete row.created_at;
  delete row.updated_at;

  const { data, error } = await supabase
    .from('webinars')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return snakeToCamel<Webinar>(data);
}

export async function deleteWebinar(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('webinars')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// --- Registration operations ---

export async function getAllRegistrations(): Promise<Registration[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .order('registered_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<Registration>(row));
}

export async function getRegistrationsByWebinar(webinarId: string): Promise<Registration[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('webinar_id', webinarId)
    .order('registered_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<Registration>(row));
}

export async function getRegistrationCount(webinarId: string): Promise<number> {
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('webinar_id', webinarId);
  if (error) throw error;
  return count ?? 0;
}

export async function getRegistrationByEmail(
  webinarId: string, email: string
): Promise<Registration | null> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('webinar_id', webinarId)
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ? snakeToCamel<Registration>(data) : null;
}

export async function createRegistration(
  registration: Omit<Registration, 'id' | 'registeredAt'>
): Promise<Registration> {
  const row = camelToSnake(registration as unknown as Record<string, unknown>);
  delete row.id;
  delete row.registered_at;

  const { data, error } = await supabase
    .from('registrations')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel<Registration>(data);
}

export async function updateRegistration(
  id: string, updates: Partial<Registration>
): Promise<Registration | null> {
  const row = camelToSnake(updates as unknown as Record<string, unknown>);
  delete row.id;

  const { data, error } = await supabase
    .from('registrations')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return snakeToCamel<Registration>(data);
}

// --- Chat operations ---

export async function getChatMessages(webinarId: string): Promise<ChatMessageData[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('webinar_id', webinarId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<ChatMessageData>(row));
}

export async function addChatMessage(
  message: Omit<ChatMessageData, 'id' | 'createdAt'>
): Promise<ChatMessageData> {
  const row = camelToSnake(message as unknown as Record<string, unknown>);
  delete row.id;
  delete row.created_at;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel<ChatMessageData>(data);
}

// --- Order operations ---

export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<Order>(row));
}

export async function getOrderBySessionId(stripeSessionId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? snakeToCamel<Order>(data) : null;
}

export async function getOrdersByEmail(email: string, webinarId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('email', email)
    .eq('webinar_id', webinarId);
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<Order>(row));
}

export async function createOrder(
  order: Omit<Order, 'id' | 'createdAt'>
): Promise<Order> {
  const row = camelToSnake(order as unknown as Record<string, unknown>);
  delete row.id;
  delete row.created_at;

  const { data, error } = await supabase
    .from('orders')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel<Order>(data);
}

export async function updateOrder(
  id: string, updates: Partial<Order>
): Promise<Order | null> {
  const row = camelToSnake(updates as unknown as Record<string, unknown>);
  delete row.id;

  const { data, error } = await supabase
    .from('orders')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return snakeToCamel<Order>(data);
}

export async function updateOrderStatus(
  id: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: toStatus })
    .eq('id', id)
    .eq('status', fromStatus)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function getOrderByActivationCode(code: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('activation_code', code)
    .maybeSingle();
  if (error) throw error;
  return data ? snakeToCamel<Order>(data) : null;
}

// --- Video File operations ---

export async function getVideoFiles(): Promise<VideoFile[]> {
  const { data, error } = await supabase
    .from('video_files')
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => snakeToCamel<VideoFile>(row));
}

export async function getVideoFileById(id: string): Promise<VideoFile | null> {
  const { data, error } = await supabase
    .from('video_files')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? snakeToCamel<VideoFile>(data) : null;
}

export async function createVideoFile(
  videoFile: Omit<VideoFile, 'id' | 'uploadedAt'>
): Promise<VideoFile> {
  const row = camelToSnake(videoFile as unknown as Record<string, unknown>);
  delete row.id;
  delete row.uploaded_at;

  const { data, error } = await supabase
    .from('video_files')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel<VideoFile>(data);
}

export async function updateVideoFile(
  id: string, updates: Partial<VideoFile>
): Promise<VideoFile | null> {
  const row = camelToSnake(updates as unknown as Record<string, unknown>);
  delete row.id;

  const { data, error } = await supabase
    .from('video_files')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return snakeToCamel<VideoFile>(data);
}

export async function deleteVideoFile(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('video_files')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// --- Post-webinar email retargeting list ---

export async function recordPostWebinarRecipient(args: {
  webinarId: string;
  email: string;
  name: string;
}): Promise<void> {
  // Resolve URL alias (e.g. "1") to real UUID — webinar_id column is typed uuid
  const webinar = await getWebinarById(args.webinarId).catch(() => null);
  if (!webinar) {
    console.error('[recordPostWebinarRecipient] webinar not found:', args.webinarId);
    return;
  }
  const resolvedWebinarId = webinar.id;

  // Look up registration to snapshot UTM attribution at email-send time
  const registration = await getRegistrationByEmail(resolvedWebinarId, args.email).catch(() => null);

  const insertRow = {
    webinar_id: resolvedWebinarId,
    email: args.email,
    name: args.name || '',
    sent_at: new Date().toISOString(),
    utm_source: registration?.utmSource ?? null,
    utm_medium: registration?.utmMedium ?? null,
    utm_campaign: registration?.utmCampaign ?? null,
    utm_content: registration?.utmContent ?? null,
    gclid: registration?.gclid ?? null,
    registered_at: registration?.registeredAt ?? null,
  };

  const { data, error } = await supabase
    .from('post_webinar_email_recipients')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    // Unique violation (23505) on (webinar_id, email) — already recorded, dedup OK
    if (error.code === '23505') return;
    console.error('[recordPostWebinarRecipient] insert failed:', error);
    return;
  }

  // Real-time mirror to Google Sheet (fire-and-forget — Supabase is source of truth,
  // marketing manually reconciles any Sheet drift)
  appendRetargetingRowToSheet(snakeToCamel<PostWebinarEmailRecipient>(data)).catch(err =>
    console.error('[recordPostWebinarRecipient] sheet append failed:', err)
  );
}
