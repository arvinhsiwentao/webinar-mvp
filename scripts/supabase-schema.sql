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
