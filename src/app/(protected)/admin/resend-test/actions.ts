"use server";

import { requireSkill } from "@/lib/dal";
import { sendEmail } from "@/lib/email";

export type ResendTestResult = {
  ok: boolean;
  message: string;
  configured: boolean;
};

/**
 * Send a canary email to a target address to verify RESEND_API_KEY works.
 * Restricted to admin skill because it consumes Resend quota.
 */
export async function sendResendTest(
  to: string,
): Promise<ResendTestResult> {
  await requireSkill("admin");

  const configured = Boolean(process.env.RESEND_API_KEY);
  if (!configured) {
    return {
      ok: false,
      configured: false,
      message:
        "RESEND_API_KEY is not set in the environment. Add it in Vercel → Settings → Environment Variables and redeploy.",
    };
  }

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return {
      ok: false,
      configured,
      message: "Invalid recipient email.",
    };
  }

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif; color: #0E2A44; max-width: 560px;">
      <h1 style="font-size: 24px; margin: 0 0 12px;">Resend está a funcionar ✓</h1>
      <p>Este é um email de teste do Backpackers Outpost.</p>
      <p style="color: #64748b; font-size: 12px;">Se recebeste isto, o RESEND_API_KEY está bem configurado.</p>
    </div>
  `.trim();

  const result = await sendEmail({
    to,
    subject: "Backpackers — email de teste",
    html,
  });

  if (!result.ok) {
    return {
      ok: false,
      configured,
      message: `Resend rejeitou o envio: ${result.error ?? "unknown error"}`,
    };
  }

  return {
    ok: true,
    configured,
    message: `Enviado com id ${result.id}. Verifica a caixa de entrada.`,
  };
}
