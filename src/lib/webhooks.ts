import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDeliveries, webhooks } from "@/lib/db/schema";

/**
 * Every webhook event we can dispatch. Keep in sync with the workflow
 * engine's trigger names (plus admin.test).
 */
export const WEBHOOK_EVENTS = [
  "contact.created",
  "contact.stage_changed",
  "deal.won",
  "task.completed",
  "admin.test",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

/** 32 bytes hex = a comfortable shared secret for HMAC-SHA256. */
export function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

const DELIVERY_TIMEOUT_MS = 5000;

/**
 * Fire all active webhooks subscribed to `event` in parallel. Best-effort —
 * failures are logged into webhook_deliveries but never thrown. Callers
 * don't need to await this if they don't want to (the DB writes happen
 * regardless).
 *
 * Signature header: `X-Backpackers-Signature: sha256=<hex>` — receivers
 * compute HMAC-SHA256(secret, raw_body) and constant-time-compare.
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const subs = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.isActive, true),
          // events is a text[] — Postgres @> checks containment.
          sql`${webhooks.events} @> ARRAY[${event}]::text[]`,
        ),
      );

    if (subs.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    const body = JSON.stringify(payload);

    await Promise.all(
      subs.map((wh) => deliverOne(wh.id, wh.url, wh.secret, event, body)),
    );
  } catch (err) {
    console.error("[webhooks] dispatch failed:", err);
  }
}

async function deliverOne(
  webhookId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  body: string,
): Promise<void> {
  const signature = sign(secret, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "backpackers-webhooks/1",
        "X-Backpackers-Event": event,
        "X-Backpackers-Signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    statusCode = res.status;
    // Cap the stored response — receivers might dump lots.
    responseBody = (await res.text()).slice(0, 4000);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
  }

  try {
    await db.insert(webhookDeliveries).values({
      webhookId,
      event,
      requestBody: JSON.parse(body),
      statusCode,
      responseBody,
      error,
    });
  } catch (dbErr) {
    console.error("[webhooks] failed to log delivery:", dbErr);
  }
}

/** Fire a `admin.test` event for a single webhook. Used by the admin UI. */
export async function sendTestWebhook(webhookId: string): Promise<void> {
  const [wh] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, webhookId))
    .limit(1);
  if (!wh) return;

  const payload: WebhookPayload = {
    event: "admin.test",
    timestamp: new Date().toISOString(),
    data: { message: "This is a test webhook from the Backpackers backoffice." },
  };
  const body = JSON.stringify(payload);
  await deliverOne(wh.id, wh.url, wh.secret, "admin.test", body);
}
