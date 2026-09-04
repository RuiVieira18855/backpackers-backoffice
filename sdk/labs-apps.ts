/**
 * Backpackers Labs — Apps SDK (shell partilhado) — v1
 * =============================================================================
 * Fonte de verdade. Copiar verbatim para cada app (o Cairn tem-no em
 * app/src/lib/labs-apps.ts). Não divergir.
 *
 * Complementa backpackers-access.ts: aquele responde "esta pessoa pode entrar
 * NESTA app?", este responde "que outras tools Labs é que ela já tem?", que é
 * o que o selector de apps precisa de saber.
 *
 * Depende de 43_labs_pass.sql (funções my_apps() e has_labs_pass()).
 * Sem dependências além de @supabase/supabase-js.
 * =============================================================================
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

/** Como é que a pessoa tem acesso a esta app. */
export type AccessSource = "super" | "direct" | "pass";

export type LabsApp = {
  key: string;
  name: string;
  description: string | null;
  /** Nome de ícone lucide-react (ex.: "Map"). A app decide se o usa. */
  icon: string | null;
  /** URL público, quando existe. Sem URL não há para onde saltar. */
  url: string | null;
  /** Hex, ex. "#0E2A44". */
  color: string | null;
  source: AccessSource;
};

// -----------------------------------------------------------------------------
// 1. Que tools é que esta pessoa pode abrir
// -----------------------------------------------------------------------------

/**
 * Devolve o catálogo de tools Labs que a sessão actual pode abrir, incluindo
 * as que vêm pelo Labs Pass. Devolve [] se não houver sessão ou se a migração
 * do passe ainda não tiver corrido (falha em silêncio de propósito: um
 * selector de apps nunca deve impedir alguém de trabalhar).
 */
export async function listMyApps(supabase: SupabaseClient): Promise<LabsApp[]> {
  const { data, error } = await supabase.rpc("my_apps");
  if (error) {
    console.warn("[labs-apps] my_apps failed:", error.message);
    return [];
  }
  return (data ?? []) as LabsApp[];
}

// -----------------------------------------------------------------------------
// 2. Tem passe?
// -----------------------------------------------------------------------------

/**
 * True quando a sessão actual tem um Labs Pass activo (ou é super_user).
 * Serve para o paywall saber se mostra "compra o passe" ou "já tens passe".
 */
export async function hasLabsPass(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_labs_pass");
  if (error) {
    console.warn("[labs-apps] has_labs_pass failed:", error.message);
    return false;
  }
  return Boolean(data);
}

// -----------------------------------------------------------------------------
// 3. Link de checkout do passe
// -----------------------------------------------------------------------------

/**
 * Acrescenta a identidade da pessoa a um Stripe Payment Link, para o webhook
 * saber que conta activar. Mesmo padrão que o Cairn já usa para o Cairn Pro.
 */
export function withIdentity(
  baseUrl: string | undefined,
  userId?: string | null,
  email?: string | null,
): string {
  if (!baseUrl) return "";
  const sep = baseUrl.includes("?") ? "&" : "?";
  return (
    baseUrl +
    sep +
    "client_reference_id=" +
    encodeURIComponent(userId || "") +
    "&prefilled_email=" +
    encodeURIComponent(email || "")
  );
}
