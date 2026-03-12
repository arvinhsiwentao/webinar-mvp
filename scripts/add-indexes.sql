-- Performance indexes for frequently queried columns
-- Safe to run multiple times (IF NOT EXISTS)

-- Registration lookups by email (duplicate checks, search)
create index if not exists idx_registrations_email on registrations(email);

-- Activation code lookups during fulfillment verification
create index if not exists idx_orders_activation_code on orders(activation_code);

-- Chat messages ordered by creation time (SSE streaming)
create index if not exists idx_chat_messages_created_at on chat_messages(created_at);

-- Video files ordered by upload time (admin library listing)
create index if not exists idx_video_files_uploaded_at on video_files(uploaded_at);
