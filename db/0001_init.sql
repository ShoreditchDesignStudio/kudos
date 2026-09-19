-- Kudos v2 schema — Neon Postgres.
--
-- Ported from supabase/migrations/. Nothing Supabase-specific was used, so
-- this is the same DDL: gen_random_uuid(), text[], CHECK constraints and
-- plain btree indexes all run on stock Postgres.
--
-- Single-tenant internal tool: no auth, no RLS, no per-user visibility. The
-- database is reached only by server code holding DATABASE_URL.
--
-- Apply with: psql "$DATABASE_URL" -f db/0001_init.sql

create extension if not exists "pgcrypto";

create table if not exists wins (
  id                  uuid primary key default gen_random_uuid(),
  sender_slack_id     text not null,
  recipient_slack_ids text[] not null,
  message             text not null,
  week_start_date     date not null,
  created_at          timestamptz not null default now(),

  constraint wins_recipients_nonempty
    check (array_length(recipient_slack_ids, 1) > 0),

  -- NOTE: 2000, not 320. This matches what production actually enforces.
  -- supabase/migrations/0002_message_length_cap.sql (which lowers this to
  -- 320) was never applied to the live database — 3 rows from 2026-04-24
  -- exceed 320 chars, and ALTER TABLE ADD CONSTRAINT validates existing
  -- rows, so it would have failed. See db/0002_message_length_cap.sql.
  constraint wins_message_length
    check (char_length(btrim(message)) between 1 and 2000)
);

create index if not exists wins_week_idx   on wins (week_start_date);
create index if not exists wins_sender_idx on wins (sender_slack_id);

-- RLS is intentionally NOT enabled. The only client of this database is the
-- Next.js app using DATABASE_URL; the browser never connects directly.
