-- Chatbot inquiries table: stores user questions submitted via floating FAQ chatbot
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chatbot_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL,
  question TEXT NOT NULL,
  page_source TEXT NOT NULL DEFAULT 'unknown',  -- 'live' | 'checkout' | 'end'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for admin queries (newest first)
CREATE INDEX idx_chatbot_inquiries_created_at ON chatbot_inquiries (created_at DESC);
