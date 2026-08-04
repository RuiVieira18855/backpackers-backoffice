import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { collectionByKey } from "@/lib/babyland/collections";
import { isBabylandConfigured, listDocs } from "@/lib/babyland/firestore";
import { DocRows } from "../rows";

export const dynamic = "force-dynamic";

export default async function BabylandCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ col: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("admin_grupo");
  const { col } = await params;
  const { q } = await searchParams;
  const def = collectionByKey(col);
  if (!def) notFound();

  if (!isBabylandConfigured()) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-10">
        <EmptyState
          title="Falta a credencial da BabyLand"
          description="Define BABYLAND_SERVICE_ACCOUNT no ambiente para o Outpost poder ler o Firestore."
          action={{ label: "Voltar", href: "/admin/babyland" }}
        />
      </div>
    );
  }

  let docs = await listDocs(def.collection);
  const term = (q ?? "").trim().toLowerCase();
  if (term) {
    docs = docs.filter((d) =>
      def.searchFields.some((f) =>
        String(d[f] ?? "").toLowerCase().includes(term),
      ),
    );
  }

  // Eventos: os passados aparecem no fim e assinalados, porque a app esconde-os.
  if (def.key === "eventos") {
    const hoje = new Date().toISOString().slice(0, 10);
    docs.sort((a, b) => {
      const da = String(a.isoDate ?? "");
      const dbb = String(b.isoDate ?? "");
      const pa = da < hoje ? 1 : 0;
      const pb = dbb < hoje ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return da.localeCompare(dbb);
    });
  } else {
    docs.sort((a, b) =>
      String(a[def.titleField] ?? "").localeCompare(
        String(b[def.titleField] ?? ""),
        "pt",
      ),
    );
  }

  const futuros =
    def.key === "eventos"
      ? docs.filter(
          (d) => String(d.isoDate ?? "") >= new Date().toISOString().slice(0, 10),
        ).length
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/babyland">
            <ChevronLeft className="mr-1 h-4 w-4" />
            BabyLand
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
              {def.label}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {def.description}
            </p>
          </div>
          <Button asChild>
            <Link href={`/admin/babyland/${def.key}/novo`}>
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Link>
          </Button>
        </div>
      </div>

      {def.notice && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{def.notice}</p>
        </div>
      )}

      {futuros === 0 && docs.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          Não há nenhum evento futuro. Neste momento o separador Eventos da app
          está vazio para quem a abrir.
        </div>
      )}

      <form className="flex gap-2" action={`/admin/babyland/${def.key}`}>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={`Procurar em ${def.label.toLowerCase()}...`}
          className="h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm"
        />
        <Button type="submit" variant="secondary" size="sm">
          Procurar
        </Button>
      </form>

      {docs.length === 0 ? (
        <EmptyState
          title={term ? "Sem resultados" : `Ainda não há ${def.label.toLowerCase()}`}
          description={
            term
              ? "Tenta outra pesquisa."
              : "Cria o primeiro registo para aparecer na app."
          }
          action={{ label: "Novo", href: `/admin/babyland/${def.key}/novo` }}
        />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <DocRows colKey={def.key} def={def} rows={docs} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
