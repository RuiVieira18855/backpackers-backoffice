import "server-only";

/**
 * Transactional email via the Resend REST API.
 *
 * Calls https://api.resend.com/emails with the RESEND_API_KEY env var.
 * If the key is missing the helper logs a warning and returns ok:false —
 * callers should treat email failure as non-blocking (the rest of the
 * primary action must still succeed).
 *
 * No SDK install needed; we POST raw JSON.
 *
 * From address comes from RESEND_FROM_EMAIL (e.g. "Backpackers <noreply@your-domain.com>")
 * or falls back to "onboarding@resend.dev" which works on Resend's free tier
 * for testing but only sends to the account owner's email.
 */

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Override the default from address for this single send. */
  from?: string;
  /** Optional reply-to. */
  replyTo?: string;
  /** Plain headers passthrough (rare). */
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping email send. Subject:",
      params.subject,
    );
    return { ok: false, error: "RESEND_API_KEY missing", skipped: true };
  }
  if (!params.html && !params.text) {
    return { ok: false, error: "Need html or text body" };
  }

  const from =
    params.from ?? process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const body = {
    from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    reply_to: params.replyTo,
    headers: params.headers,
  };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email] resend rejected:", res.status, text);
      return { ok: false, error: `${res.status}: ${text}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed:", msg);
    return { ok: false, error: msg };
  }
}

/** Tiny HTML→text fallback for clients that prefer plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
