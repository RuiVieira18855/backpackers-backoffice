import "server-only";

/**
 * Pede ao site público de marketing (deploy separado) para revalidar páginas,
 * para que uma publicação em Outpost apareça lá de imediato.
 *
 * No-op enquanto WEB_REVALIDATE_URL/WEB_REVALIDATE_SECRET não estiverem
 * configurados. Nunca bloqueia nem faz falhar a acção do utilizador.
 */
export async function revalidateWeb(paths: string[]): Promise<void> {
  const base = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.WEB_REVALIDATE_SECRET;
  if (!base || !secret) return;
  await Promise.all(
    paths.map((p) =>
      fetch(
        `${base}?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(p)}`,
        { method: "POST" },
      ).catch(() => undefined),
    ),
  ).catch(() => undefined);
}
