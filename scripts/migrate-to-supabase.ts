/**
 * Data migration script: JSON files -> Supabase
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-to-supabase.ts
 *
 * Reads data from /data/*.json and inserts into Supabase tables,
 * mapping old string IDs to new UUIDs for foreign key references.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  console.error('Run with: npx tsx --env-file=.env.local scripts/migrate-to-supabase.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Remove fields that no longer exist in the Supabase schema
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
      const num = parseInt(oldWebinarId as string, 10);
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
    if (!newWebinarId) {
      console.warn(`Skipping chat message — no webinar mapping for ${oldWebinarId}`);
      continue;
    }

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
    if (!newWebinarId) {
      console.warn(`Skipping order — no webinar mapping for ${oldWebinarId}`);
      continue;
    }

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
