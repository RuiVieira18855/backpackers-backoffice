import "server-only";

/**
 * Pede ao Herbarium (deploy separado) para revalidar as páginas afectadas, para
 * que publicar uma ficha no Outpost apareça no guia de campo de imediato.
 *
 * Mesmo contrato do revalidateWeb do site de marketing: no-op enquanto
 * HERBARIUM_REVALIDATE_URL/SECRET não estiverem configurados, e nunca falha a
 * acção do utilizador por causa de um deploy que esteja em baixo.
 */
export async function revalidateHerbarium(paths: string[]): Promise<void> {
  const base = process.env.HERBARIUM_REVALIDATE_URL;
  const secret = process.env.HERBARIUM_REVALIDATE_SECRET;
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
