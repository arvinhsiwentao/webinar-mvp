-- Add UTM and gclid attribution columns to registrations table.
-- These capture the marketing attribution parameters present at registration time.
-- All nullable — users may arrive without any UTM params.

alter table registrations add column if not exists utm_source text;
alter table registrations add column if not exists utm_medium text;
alter table registrations add column if not exists utm_campaign text;
alter table registrations add column if not exists utm_content text;
alter table registrations add column if not exists gclid text;
