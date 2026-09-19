import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dbResult = await checkDb();

  return NextResponse.json({
    db: dbResult.ok ? "ok" : "fail",
    db_error: dbResult.ok ? undefined : dbResult.error,
    db_url_set: Boolean(process.env.DATABASE_URL),
    // Host only. The Neon connection string embeds the role password, so we
    // never echo the URL itself — URL.host is hostname:port and carries no
    // credentials.
    db_url_host: process.env.DATABASE_URL
      ? safeHost(process.env.DATABASE_URL)
      : undefined,
    db_pooled: process.env.DATABASE_URL?.includes("-pooler.") ?? false,
    slack_token_set: Boolean(process.env.SLACK_BOT_TOKEN),
    reminder_channel_set: Boolean(process.env.SLACK_REMINDER_CHANNEL_ID),
    app_base_url: process.env.APP_BASE_URL ?? null,
    now: new Date().toISOString(),
  });
}

async function checkDb(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await db()`select id from wins limit 1`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid URL)";
  }
}
