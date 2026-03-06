# Supabase Migration + Admin Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace JSON file storage with Supabase, add password protection to /admin, and clean up dead fields from the admin panel.

**Architecture:** Rewrite `src/lib/db.ts` to use Supabase client instead of filesystem. All exported functions become async. API routes add `await`. Middleware protects admin routes with cookie-based password auth. Dead fields removed from types, form, and API.

**Tech Stack:** Supabase (hosted Postgres), `@supabase/supabase-js`, Next.js middleware, Node.js `crypto` for HMAC session tokens.

---

## Task 1: Install Supabase and create client

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase.ts`
- Create: `.env.local` (add variables — do NOT commit)

**Step 1: Install dependency**

Run:
```bash
npm install @supabase/supabase-js
```

**Step 2: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**Step 3: Add env vars to `.env.local`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-admin-password
```

**Step 4: Commit**

```bash
git add src/lib/supabase.ts package.json package-lock.json
git commit -m "feat: add Supabase client and dependency"
```

---

## Task 2: Create Supabase schema

**Files:**
- Create: `scripts/supabase-schema.sql`

**Step 1: Write the schema SQL**

Create `scripts/supabase-schema.sql`:

```sql
-- Webinars table
-- Nested arrays (auto_chat, cta_events, subtitle_cues, evergreen, highlights)
-- are JSONB columns because they are always read/written with the parent webinar,
-- never queried independently.
create table if not exists webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker_name text not null,
  speaker_title text,
  speaker_image text,
  speaker_avatar text,
  video_url text not null,
  duration integer not null default 60,
  highlights jsonb not null default '[]',
  auto_chat jsonb not null default '[]',
  cta_events jsonb not null default '[]',
  subtitle_cues jsonb default '[]',
  subtitle_language text,
  subtitle_last_generated_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'ended')),
  viewer_peak_target integer default 60,
  viewer_ramp_minutes integer default 15,
  webhook_url text,
  hero_image_url text,
  promo_image_url text,
  disclaimer_text text,
  end_page_sales_copy text,
  end_page_cta_text text,
  sidebar_description text,
  evergreen jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registrations table
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references webinars(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  assigned_slot timestamptz,
  slot_expires_at timestamptz,
  reassigned_from timestamptz,
  registered_at timestamptz not null default now(),
  unique(webinar_id, email)
);
create index if not exists idx_registrations_webinar_id on registrations(webinar_id);

-- Chat messages (real user messages, not auto-chat)
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references webinars(id) on delete cascade,
  name text not null,
  message text not null,
  timestamp real not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_webinar_id on chat_messages(webinar_id);

-- Stripe orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references webinars(id) on delete cascade,
  email text not null,
  name text not null,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  activation_code text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'refunded', 'expired')),
  amount integer not null,
  currency text not null default 'usd',
  metadata jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  fulfilled_at timestamptz
);
create index if not exists idx_orders_email_webinar on orders(email, webinar_id);

-- Raw analytics events (append-only, unstructured)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Auto-update updated_at on webinars
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger webinars_updated_at
  before update on webinars
  for each row execute function update_updated_at();
```

**Step 2: Run in Supabase SQL Editor**

Go to your Supabase project dashboard > SQL Editor > paste and run the script.

**Step 3: Commit**

```bash
git add scripts/supabase-schema.sql
git commit -m "feat: add Supabase schema SQL"
```

---

## Task 3: Clean up types — remove dead fields

**Files:**
- Modify: `src/lib/types.ts:3-185`

**Step 1: Remove dead fields from `CTAEvent`**

In `src/lib/types.ts:3-15`, remove the `icon` field (line 14). Keep `position`, `color`, `secondaryText` — they are used at runtime by CTAOverlay.

Result:
```typescript
export interface CTAEvent {
  id: string;
  showAtSec: number;
  hideAtSec: number;
  buttonText: string;
  url: string;
  promoText?: string;
  showCountdown: boolean;
  position?: 'on_video' | 'below_video';
  color?: string;
  secondaryText?: string;
}
```

**Step 2: Remove dead fields from `Webinar`**

In `src/lib/types.ts:53-108`, remove these fields:
- `subtitle` (line 56) — never rendered on any page
- `speakerBio` (line 59) — landing page hardcodes bio text
- `thumbnailUrl` (line 63) — never rendered
- `viewerBaseCount` (line 72) — legacy, replaced by viewerPeakTarget
- `viewerMultiplier` (line 73) — fully dead
- `heroEyebrowText` (line 80) — landing page hardcodes value
- `endPageCtaUrl` (line 91) — end page routes to /checkout automatically
- `endPageCtaColor` (line 92) — button uses design system color
- `missedWebinarUrl` (line 98) — evergreen auto-reassigns slots
- `prerollVideoUrl` (line 104) — never wired to VideoPlayer

Result `Webinar` interface:
```typescript
export interface Webinar {
  id: string;
  title: string;
  speakerName: string;
  speakerTitle?: string;
  speakerImage?: string;
  speakerAvatar?: string;
  videoUrl: string;
  duration: number;
  highlights: string[];
  autoChat: AutoChatMessage[];
  ctaEvents: CTAEvent[];
  subtitleCues?: WebinarSubtitleCue[];
  subtitleLanguage?: string;
  subtitleLastGeneratedAt?: string;
  status: 'draft' | 'published' | 'ended';
  viewerPeakTarget?: number;
  viewerRampMinutes?: number;
  webhookUrl?: string;
  heroImageUrl?: string;
  promoImageUrl?: string;
  disclaimerText?: string;
  endPageSalesCopy?: string;
  endPageCtaText?: string;
  sidebarDescription?: string;
  evergreen?: EvergreenConfig;
  createdAt: string;
  updatedAt: string;
}
```

**Step 3: Remove dead fields from `CreateWebinarRequest`**

In `src/lib/types.ts:151-185`, remove matching fields:
- `subtitle`, `speakerBio`, `thumbnailUrl`, `viewerBaseCount`, `viewerMultiplier`
- `heroEyebrowText`, `endPageCtaUrl`, `endPageCtaColor`, `missedWebinarUrl`, `prerollVideoUrl`

**Step 4: Run type check**

```bash
npx tsc --noEmit
```

Fix any resulting errors in files that reference removed fields. Expected breakages:
- `src/lib/db.ts` (sample data references removed fields)
- `src/app/(admin)/admin/_components/WebinarForm.tsx` (form fields for removed properties)
- `src/app/api/admin/webinar/route.ts` (default values for removed fields)

Do NOT fix these yet — Tasks 4, 5, and 6 will handle them.

**Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: remove 11 dead fields from Webinar and CTAEvent types"
```

---

## Task 4: Clean up admin form — remove dead fields, add CTA fields

**Files:**
- Modify: `src/app/(admin)/admin/_components/WebinarForm.tsx:1-783`

**Step 1: Remove dead fields from `formData` state**

In `WebinarForm.tsx:28-55`, remove these from the `formData` useState:
- `subtitle` (line 30)
- `speakerBio` (line 33)
- `thumbnailUrl` (line 37)
- `prerollVideoUrl` (line 38)
- `heroEyebrowText` (line 45)
- `missedWebinarUrl` (line 49)
- `endPageCtaUrl` (line 52)
- `endPageCtaColor` (line 53)

**Step 2: Remove corresponding form sections from JSX**

Remove from the JSX:
- Subtitle input (around line 177-184)
- Speaker Bio textarea (around line 275-282)
- Thumbnail URL input (around line 209-218)
- Preroll Video URL input (around line 219-228)
- Hero Eyebrow Text input (around line 314-323)
- Missed Webinar URL input (around line 680-688)
- End Page CTA URL input (around line 718-725)
- End Page CTA Color input + preview (around line 728-745)

**Step 3: Add missing CTA fields to `CTAField` interface and form**

Update the `CTAField` interface (line 13-20):
```typescript
interface CTAField {
  showAtSec: string;
  hideAtSec: string;
  buttonText: string;
  url: string;
  promoText: string;
  showCountdown: boolean;
  position: string;
  color: string;
  secondaryText: string;
}
```

Update CTA state initialization (line 65-74) to map these fields:
```typescript
const [ctaEvents, setCtaEvents] = useState<CTAField[]>(
  webinar?.ctaEvents.map(c => ({
    showAtSec: String(c.showAtSec),
    hideAtSec: String(c.hideAtSec),
    buttonText: c.buttonText,
    url: c.url,
    promoText: c.promoText || '',
    showCountdown: c.showCountdown,
    position: c.position || 'below_video',
    color: c.color || '',
    secondaryText: c.secondaryText || '',
  })) || []
);
```

Update CTA payload in `handleSubmit` (around line 116-123):
```typescript
ctaEvents: ctaEvents.filter(c => c.buttonText && c.url).map(c => ({
  showAtSec: parseInt(c.showAtSec) || 0,
  hideAtSec: parseInt(c.hideAtSec) || 0,
  buttonText: c.buttonText,
  url: c.url,
  promoText: c.promoText || undefined,
  showCountdown: c.showCountdown,
  position: c.position || 'below_video',
  color: c.color || undefined,
  secondaryText: c.secondaryText || undefined,
})),
```

Update the "add CTA" button default (around line 516):
```typescript
onClick={() => setCtaEvents([...ctaEvents, {
  showAtSec: '',
  hideAtSec: '',
  buttonText: '',
  url: '',
  promoText: '',
  showCountdown: true,
  position: 'below_video',
  color: '',
  secondaryText: '',
}])}
```

Add three new inputs to each CTA card in the `renderItem` callback (after the promoText input, around line 580):

```tsx
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-xs text-neutral-400 mb-1">位置</label>
    <select
      value={cta.position}
      onChange={(e) => update('position', e.target.value as CTAField[keyof CTAField])}
      className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
    >
      <option value="below_video">视频下方</option>
      <option value="on_video">视频上方 (浮层)</option>
    </select>
  </div>
  <div>
    <label className="block text-xs text-neutral-400 mb-1">按钮颜色</label>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={cta.color}
        onChange={(e) => update('color', e.target.value as CTAField[keyof CTAField])}
        placeholder="#B8953F"
        className="flex-1 bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
      />
      {cta.color && (
        <div
          className="w-8 h-8 rounded border border-neutral-300 shrink-0"
          style={{ backgroundColor: cta.color }}
        />
      )}
    </div>
  </div>
</div>
<input
  type="text"
  value={cta.secondaryText}
  onChange={(e) => update('secondaryText', e.target.value as CTAField[keyof CTAField])}
  placeholder="副标题文字 (选填)"
  className="w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm"
/>
```

**Step 4: Run type check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/(admin)/admin/_components/WebinarForm.tsx
git commit -m "refactor: remove dead fields from admin form, add CTA position/color/secondaryText"
```

---

## Task 5: Rewrite db.ts to use Supabase

**Files:**
- Modify: `src/lib/db.ts:1-297` (complete rewrite)

This is the core migration task. Every exported function becomes `async` and uses the Supabase client instead of filesystem operations.

**Step 1: Write the new db.ts**

Complete rewrite of `src/lib/db.ts`:

```typescript
import { supabase } from './supabase';
import { Webinar, Registration, ChatMessageData, Order } from './types';

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
  // Try UUID match first
  const { data: byId } = await supabase
    .from('webinars')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (byId) return snakeToCamel<Webinar>(byId);

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

// --- Tracking events ---

export async function appendEvent(event: unknown): Promise<void> {
  const { error } = await supabase
    .from('events')
    .insert({ data: event });
  if (error) throw error;
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

export async function getOrderByActivationCode(code: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('activation_code', code)
    .maybeSingle();
  if (error) throw error;
  return data ? snakeToCamel<Order>(data) : null;
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expect errors in all 15 call-site files — they still call these functions synchronously. That's fixed in Task 6.

**Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: rewrite db.ts to use Supabase instead of JSON files"
```

---

## Task 6: Add `await` to all db.ts call sites

**Files:** All 14 API route files + 1 utility file that import from `@/lib/db`.

Every db function is now async. Add `await` before each call. All call sites are already inside `async` functions, so this is mechanical.

**File list with specific changes:**

### 6a. `src/app/api/admin/webinar/route.ts`

- Line 2: Remove `generateId` from import (Supabase generates UUIDs)
- Line 7: `const webinars = await getAllWebinars();`
- Lines 23-26: `autoChat` and `ctaEvents` no longer need `generateId()` — Supabase IDs are in JSONB, keep client-generated IDs via `crypto.randomUUID()`
- Line 34: `const webinar = await createWebinar({...});`
- Remove `viewerBaseCount` and `viewerMultiplier` defaults (fields removed)

### 6b. `src/app/api/admin/webinar/[id]/route.ts`

- Line 2: Remove `generateId` from import, use `crypto.randomUUID()` instead
- Line 10: `const webinar = await getWebinarById(id);`
- Line 19: `const registrations = await getRegistrationsByWebinar(id);`
- Line 45: `const webinar = await updateWebinar(id, body);`
- Line 69: `const deleted = await deleteWebinar(id);`

### 6c. `src/app/api/webinar/route.ts`

- Line 5: `const webinars = await getAllWebinars();`

### 6d. `src/app/api/webinar/[id]/route.ts`

- Line 10: `const webinar = await getWebinarById(id);`
- Line 17: `const registrationCount = await getRegistrationCount(id);`

### 6e. `src/app/api/webinar/[id]/chat/route.ts`

- Line 11: `const webinar = await getWebinarById(id);`
- Line 19: `const messages = await getChatMessages(id);`
- Line 40: `const webinar = await getWebinarById(id);`
- Line 48: `const newMessage = await addChatMessage({...});`

### 6f. `src/app/api/webinar/[id]/next-slot/route.ts`

- Line 10: `const webinar = await getWebinarById(id);`

### 6g. `src/app/api/webinar/[id]/reassign/route.ts`

- Line 17: `const webinar = await getWebinarById(id);`
- Line 30: `const updated = await updateRegistration(registrationId, {...});`

### 6h. `src/app/api/register/route.ts`

- Line 34: `const webinar = await getWebinarById(body.webinarId);`
- Line 43: `const existingReg = await getRegistrationByEmail(body.webinarId, body.email);`
- Line 68: `const registration = await createRegistration(...);`

### 6i. `src/app/api/track/route.ts`

- Line 7: `await appendEvent(event);`

### 6j. `src/app/api/checkout/create-session/route.ts`

- Line 15: `const existingOrders = await getOrdersByEmail(email, webinarId);`
- Line 27: `const webinar = await getWebinarById(webinarId);`
- Line 55: `await createOrder({...});`

### 6k. `src/app/api/checkout/session-status/route.ts`

- Line 18: `const order = await getOrderBySessionId(sessionId);`
- Line 22: change `while` loop for activation code uniqueness:
  ```typescript
  let code = generateActivationCode();
  while (await getOrderByActivationCode(code)) {
    code = generateActivationCode();
  }
  ```
- Line 27: `await updateOrder(order.id, {...});`

### 6l. `src/app/api/checkout/webhook/route.ts`

- Line 32: `const order = await getOrderBySessionId(session.id);`
- Lines 46-48: same activation code pattern with `await`
- Line 52: `await updateOrder(order.id, {...});`

### 6m. `src/app/api/cron/reminders/route.ts`

- Line 6: `const webinars = await getAllWebinars();`
- Line 12: `const registrations = await getRegistrationsByWebinar(webinar.id);`

### 6n. `src/app/api/subtitles/generate/route.ts`

- Find the `updateWebinar` call and add `await`

### 6o. `src/lib/subtitles/logger.ts`

- Line 1: Change `import { generateId } from '@/lib/db'` to use `crypto.randomUUID()` instead:
  ```typescript
  function generateId(): string {
    return crypto.randomUUID();
  }
  ```
  This file does NOT use Supabase — it only needs unique IDs for log records.

**Step: Run type check after all changes**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step: Commit**

```bash
git add -u
git commit -m "refactor: add await to all db.ts call sites for async Supabase"
```

---

## Task 7: Add admin password protection

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/(admin)/admin/login/page.tsx`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`

**Step 1: Create login API route**

Create `src/app/api/admin/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // Create HMAC-signed session token: timestamp:hmac
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac('sha256', adminPassword).update(timestamp).digest('hex');
  const token = `${timestamp}:${hmac}`;

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  });

  return response;
}
```

**Step 2: Create logout API route**

Create `src/app/api/admin/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
```

**Step 3: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

function validateAdminSession(cookie: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const [timestamp, hmac] = cookie.split(':');
  if (!timestamp || !hmac) return false;

  // Check token age (24h max)
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 86400000 || age < 0) return false;

  // Verify HMAC — use Web Crypto (Edge Runtime compatible)
  // Note: middleware runs in Edge Runtime, no Node crypto module.
  // Use a simple timing-safe comparison with TextEncoder.
  const encoder = new TextEncoder();
  const key = encoder.encode(adminPassword);
  const data = encoder.encode(timestamp);

  // Recreate expected HMAC using SubtleCrypto
  // Since this is async in Edge, we use a sync hex comparison workaround:
  // Store a pre-shared hash approach. For MVP simplicity, just compare directly.
  // Edge Runtime limitation: crypto.createHmac is not available.
  // Workaround: use a simple hash comparison.

  // For MVP, use a simpler approach: the token is just base64(password:timestamp)
  // and we verify it matches.
  return true; // Placeholder — replaced in step 3b
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Skip login endpoints
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('admin_session')?.value;
  if (!cookie || !validateAdminSession(cookie)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

**Step 3b: Fix Edge Runtime HMAC validation**

The middleware runs in Edge Runtime where Node.js `crypto` is unavailable. Use Web Crypto API:

Replace the `validateAdminSession` function:

```typescript
async function validateAdminSessionAsync(cookie: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const [timestamp, providedHmac] = cookie.split(':');
  if (!timestamp || !providedHmac) return false;

  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 86400000 || age < 0) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(adminPassword),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  const expectedHmac = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedHmac === providedHmac;
}
```

And update the middleware function to be `async`:

```typescript
export async function middleware(request: NextRequest) {
  // ... same as above but:
  if (!cookie || !(await validateAdminSessionAsync(cookie))) {
    // ...
  }
}
```

**Step 4: Create login page**

Create `src/app/(admin)/admin/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('密码错误');
        return;
      }

      router.push('/admin');
    } catch {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-neutral-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-center mb-6">管理后台登录</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-500 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
              autoFocus
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#B8953F] hover:bg-[#A07A2F] text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 5: Add logout button to admin page**

In `src/app/(admin)/admin/page.tsx`, add a logout button in the header (around line 63, next to the "返回首页" link):

```tsx
<button
  onClick={async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }}
  className="text-neutral-500 hover:text-neutral-900 text-sm"
>
  退出登录
</button>
```

**Step 6: Run type check and test**

```bash
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add src/middleware.ts src/app/api/admin/login/route.ts src/app/api/admin/logout/route.ts src/app/(admin)/admin/login/page.tsx src/app/(admin)/admin/page.tsx
git commit -m "feat: add password protection for admin panel"
```

---

## Task 8: Write data migration script

**Files:**
- Create: `scripts/migrate-to-supabase.ts`

**Step 1: Write migration script**

Create `scripts/migrate-to-supabase.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(filename: string): T {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [] as unknown as T;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnakeKey(key)] = value;
  }
  return result;
}

async function migrate() {
  console.log('Starting migration...');

  // --- Webinars ---
  const webinars = readJson<Record<string, unknown>[]>('webinars.json');
  const idMap = new Map<string, string>(); // old ID -> new UUID

  for (const w of webinars) {
    const oldId = w.id as string;

    // Remove fields that no longer exist in schema
    const deadFields = [
      'subtitle', 'speakerBio', 'thumbnailUrl', 'viewerBaseCount',
      'viewerMultiplier', 'heroEyebrowText', 'endPageCtaUrl',
      'endPageCtaColor', 'missedWebinarUrl', 'prerollVideoUrl',
    ];
    for (const f of deadFields) delete w[f];

    // Remove old id — Supabase generates UUID
    delete w.id;

    const row = camelToSnake(w);
    const { data, error } = await supabase
      .from('webinars')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to insert webinar "${w.title}":`, error.message);
      continue;
    }

    idMap.set(oldId, data.id);
    console.log(`Webinar "${w.title}": ${oldId} -> ${data.id}`);
  }

  // --- Registrations ---
  const registrations = readJson<Record<string, unknown>[]>('registrations.json');
  for (const r of registrations) {
    const oldWebinarId = r.webinarId as string;
    // Map to new UUID — try direct match first, then numeric fallback
    let newWebinarId = idMap.get(oldWebinarId);
    if (!newWebinarId) {
      const num = parseInt(oldWebinarId, 10);
      if (!isNaN(num)) {
        const webinarKeys = [...idMap.keys()];
        if (num >= 1 && num <= webinarKeys.length) {
          newWebinarId = idMap.get(webinarKeys[num - 1]);
        }
      }
    }
    if (!newWebinarId) {
      console.warn(`Skipping registration — no webinar mapping for ${oldWebinarId}`);
      continue;
    }

    delete r.id;
    r.webinarId = newWebinarId;
    const row = camelToSnake(r);

    const { error } = await supabase.from('registrations').insert(row);
    if (error) console.error(`Registration insert error:`, error.message);
  }
  console.log(`Migrated ${registrations.length} registrations`);

  // --- Chat messages ---
  const chatMessages = readJson<Record<string, unknown>[]>('chat-messages.json');
  for (const m of chatMessages) {
    const oldWebinarId = m.webinarId as string;
    const newWebinarId = idMap.get(oldWebinarId);
    if (!newWebinarId) continue;

    delete m.id;
    m.webinarId = newWebinarId;
    const row = camelToSnake(m);

    const { error } = await supabase.from('chat_messages').insert(row);
    if (error) console.error(`Chat message insert error:`, error.message);
  }
  console.log(`Migrated ${chatMessages.length} chat messages`);

  // --- Orders ---
  const orders = readJson<Record<string, unknown>[]>('orders.json');
  for (const o of orders) {
    const oldWebinarId = o.webinarId as string;
    const newWebinarId = idMap.get(oldWebinarId);
    if (!newWebinarId) continue;

    delete o.id;
    o.webinarId = newWebinarId;
    const row = camelToSnake(o);

    const { error } = await supabase.from('orders').insert(row);
    if (error) console.error(`Order insert error:`, error.message);
  }
  console.log(`Migrated ${orders.length} orders`);

  // --- Events ---
  if (fs.existsSync(path.join(DATA_DIR, 'events.json'))) {
    const events = readJson<unknown[]>('events.json');
    for (const e of events) {
      const { error } = await supabase.from('events').insert({ data: e });
      if (error) console.error(`Event insert error:`, error.message);
    }
    console.log(`Migrated ${events.length} events`);
  }

  console.log('\nMigration complete!');
  console.log('ID mapping (old -> new):');
  for (const [old, newId] of idMap) {
    console.log(`  ${old} -> ${newId}`);
  }
}

migrate().catch(console.error);
```

**Step 2: Run the migration**

```bash
npx tsx scripts/migrate-to-supabase.ts
```

**Step 3: Commit**

```bash
git add scripts/migrate-to-supabase.ts
git commit -m "feat: add data migration script for JSON to Supabase"
```

---

## Task 9: Update documentation

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/decisions.md`

**Step 1: Update architecture.md**

Update the "Storage Layer" section to describe Supabase instead of JSON files. Update the "Admin" route to mention password protection. Remove references to `generateId()`, `initializeSampleData()`, and JSON file paths.

**Step 2: Append to decisions.md**

```markdown
### 2026-03-06: Supabase over JSON files for data storage

Migrated from JSON file storage (`data/*.json` with `fs.readFileSync/writeFileSync`) to Supabase (hosted Postgres). JSON files couldn't handle concurrent writes — two registrations at the same time would clobber each other. Supabase solves this with real database transactions. Nested arrays (autoChat, ctaEvents, subtitleCues, evergreen) stored as JSONB columns since they're always read/written with the parent webinar. Service role key used server-side only.

### 2026-03-06: Simple password auth over Supabase Auth for admin

Added env-var-based password (`ADMIN_PASSWORD`) with HMAC-signed cookie session instead of full Supabase Auth. Only one admin user needed for MVP. Next.js middleware protects `/admin` and `/api/admin/*` routes. Login page at `/admin/login`. 24-hour session expiry.

### 2026-03-06: Admin panel field cleanup — 11 dead fields removed

Removed fields from Webinar type and admin form that were never consumed by any public page: subtitle, speakerBio, thumbnailUrl, prerollVideoUrl, heroEyebrowText, missedWebinarUrl, endPageCtaUrl, endPageCtaColor, viewerBaseCount, viewerMultiplier, CTAEvent.icon. Added 3 missing CTA fields (position, color, secondaryText) that runtime reads but the form never exposed.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: update architecture and decisions for Supabase migration"
```

---

## Task 10: Smoke test all flows

**No files changed — verification only.**

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test admin flow**

1. Navigate to `/admin` — should redirect to `/admin/login`
2. Enter wrong password — should show error
3. Enter correct password — should redirect to `/admin`
4. Create a new webinar with all fields filled
5. Edit the webinar — verify all fields load correctly
6. Check registrations tab
7. Click logout — should redirect to login

**Step 3: Test public flow**

1. Landing page `/` — should load webinar data from Supabase
2. Register with name/email/phone
3. Lobby page — countdown and slot info should work
4. Live page — video, auto-chat, CTA overlays, viewer count
5. End page — sales copy, CTA button

**Step 4: Test checkout flow**

1. Click CTA on end page — should route to `/checkout/[id]`
2. Verify Stripe session creation works

**Step 5: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|----------------|
| 1 | Install Supabase + create client | 4 |
| 2 | Create database schema SQL | 3 |
| 3 | Remove 11 dead fields from types | 5 |
| 4 | Clean up admin form + add CTA fields | 5 |
| 5 | Rewrite db.ts for Supabase | 3 |
| 6 | Add `await` to all 15 call-site files | 2 |
| 7 | Admin password protection (middleware + login) | 7 |
| 8 | Data migration script | 3 |
| 9 | Update documentation | 3 |
| 10 | Smoke test all flows | 5 |
