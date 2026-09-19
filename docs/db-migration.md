# Database: Supabase → Neon

The `wins` database moved from Supabase Postgres to Neon Postgres.
Everything else — Slack, the render pipeline, hosting on Vercel — is
unchanged.

## Why

- The Supabase org was on the Pro plan at $25/mo (+VAT) for a single table
  holding a few hundred rows and a few hundred KB. Billable usage was $0;
  the entire charge was the flat plan fee.
- The Free plan was not a safe alternative. A free Supabase project is
  **paused** after a period of inactivity and needs a human to un-pause it
  from the dashboard. Kudos runs on a weekly cadence, so a quiet week could
  leave the Slack bot dead until someone noticed.
- Neon's free tier suspends an idle compute too, but **auto-resumes on the
  next query** in a few hundred milliseconds. No dashboard, no human. That
  difference is the whole reason for the move.

## What Neon is not doing

No Auth, no Storage, no Realtime, no RLS — exactly as before. The database
is plain Postgres reached only by server code holding `DATABASE_URL`.

## Driver

`@neondatabase/serverless`, using its **HTTP** driver rather than a TCP
connection. Each query is a stateless fetch, so there is no connection pool
to exhaust across serverless invocations — the same model PostgREST gave us
under Supabase. Use the **pooled** connection string (the host contains
`-pooler`).

## What changed

| File | Change |
|---|---|
| `lib/db.ts` | `createClient` → `neon()`; returns a tagged-template query function |
| `lib/wins.ts` | `insertWin` and `getWeekWins` rewritten as SQL |
| `app/api/health/route.ts` | probe query rewritten; diagnostics report `DATABASE_URL` |
| `.env.example` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` → `DATABASE_URL` |
| `db/0001_init.sql` | schema, ported from `supabase/migrations/` |
| `package.json` | `@supabase/supabase-js` → `@neondatabase/serverless` |

Two behavioural details worth knowing:

1. **Errors throw.** `supabase-js` returned `{ data, error }`; the Neon
   driver throws. The three query sites use `try`/`catch` accordingly.
2. **`week_start_date` is cast to `::text` in SQL.** The driver parses a
   Postgres `date` into a JS `Date`, but `lib/week.ts` compares these values
   as `YYYY-MM-DD` strings (see `isWeekClosed`). Without the cast those
   comparisons fail silently. `created_at` is normalised to an ISO string in
   JS for the same reason.

## Schema drift, carried over

`supabase/migrations/0002_message_length_cap.sql` lowers the message cap
from 2000 to 320 chars. **It was never applied to the live database** — three
rows from 2026-04-24 exceed 320 chars, and `ALTER TABLE ADD CONSTRAINT`
validates existing rows, so it would have failed.

`db/0001_init.sql` therefore keeps the 2000-char constraint, matching what
production actually enforced. `db/0002_message_length_cap.sql` carries the
320 cap and the list of blocking rows; apply it once those three messages
have been shortened by hand.

Note that `MESSAGE_MAX` in `lib/wins.ts` has always enforced 320 at the
application layer, so no row written since May can trip the constraint.

## Reverting to Supabase

The Supabase material is deliberately still in the repo:
`supabase/migrations/`, `supabase/README.md`, and the Supabase sections of
`docs/wiring.md` and `docs/master-architecture.md`.

To go back:

1. Revert the migration commit (or restore `lib/db.ts`, `lib/wins.ts` and
   `app/api/health/route.ts` from before it).
2. `npm install @supabase/supabase-js`
3. Recreate a Supabase project and apply `supabase/migrations/0001_wins.sql`.
4. Load the data — see "Backups" below.
5. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; remove `DATABASE_URL`.

One gotcha if you do: `SUPABASE_URL` must be bare origin only
(`https://<ref>.supabase.co`). A trailing slash or path makes PostgREST
reject every request with `PGRST125`. The old `lib/db.ts` normalised this
defensively; check git history for that helper.

## Backups

The table is small enough to dump whole:

```bash
pg_dump "$DATABASE_URL" -t wins --no-owner --no-privileges > kudos-$(date +%F).sql
```

Data is portable in both directions — the schema is stock Postgres, so a
dump taken from either provider restores into the other unchanged.
