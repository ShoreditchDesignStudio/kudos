import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Neon serverless Postgres client. v2 has no auth, no RLS, and no
// browser-side database client — every database access goes through this
// one helper from server code.
//
// Neon's HTTP driver is used deliberately: each query is a stateless
// fetch, so there is no connection pool to exhaust across serverless
// invocations, and an idle Neon compute auto-resumes on the next query
// (no manual un-pausing, unlike a paused Supabase free project).
//
// Never import this file from a "use client" module. The "server-only"
// import above will fail the build if that ever happens.

let _sql: NeonQueryFunction<false, false> | null = null;

export function db(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;

  if (typeof window !== "undefined") {
    throw new Error("db() must not be called in a browser context");
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  _sql = neon(url);
  return _sql;
}
