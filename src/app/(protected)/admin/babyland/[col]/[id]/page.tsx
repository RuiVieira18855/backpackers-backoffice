import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { collectionByKey } from "@/lib/babyland/collections";
import { getDocById } from "@/lib/babyland/firestore";
import { DocForm } from "../../doc-form";

export const dynamic = "force-dynamic";

export default async function BabylandDocPage({
  params,
}: {
  params: Promise<{ col: string; id: string }>;
}) {
  await requireRole("admin_grupo");
  const { col, id } = await params;
  const def = collectionByKey(col);
  if (!def) notFound();

  const isNew = id === "novo";
  const doc = isNew ? null : await getDocById(def.collection, id);
  if (!isNew && !doc) notFound();

  const title = isNew
    ? `Novo registo`
    : String(doc?.[def.titleField] ?? "(sem título)");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href={`/admin/babyland/${def.key}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {def.label}
          </Link>
        </Button>
        <h1 className="font-display text-3xl sm:text-5xl text-foreground leading-none">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {def.label} · o que gravares aqui aparece na app BabyLand.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DocForm colKey={def.key} def={def} doc={doc} />
        </CardContent>
      </Card>
    </div>
  );
}
