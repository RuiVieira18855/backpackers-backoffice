import Link from "next/link";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COLLECTIONS } from "@/lib/babyland/collections";
import { countDocs, isBabylandConfigured } from "@/lib/babyland/firestore";

export const dynamic = "force-dynamic";

async function safeCount(collection: string): Promise<number | null> {
  try {
    return await countDocs(collection);
  } catch {
    return null;
  }
}

export default async function BabylandAdminPage() {
  await requireRole("admin_grupo");
  const configured = isBabylandConfigured();

  const counts = configured
    ? Object.fromEntries(
        await Promise.all(
          COLLECTIONS.map(async (c) => [c.key, await safeCount(c.collection)]),
        ),
      )
    : {};

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao admin
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          BabyLand
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Conteúdo da app BabyLand. O que gravares aqui aparece na app sem
          precisar de nova versão na loja.
        </p>
      </div>

      {!configured && (
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-start gap-3">
              <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <CardTitle className="text-base">
                  Falta a credencial da BabyLand
                </CardTitle>
                <CardDescription>
                  Define a variável de ambiente{" "}
                  <code className="font-mono">BABYLAND_SERVICE_ACCOUNT</code> com
                  o JSON da service account do projeto{" "}
                  <code className="font-mono">appbabyland</code>. Obtém-se em
                  Firebase Console, Definições do projeto, Contas de serviço,
                  Gerar nova chave privada. Até lá esta secção não lê nem escreve
                  nada.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {COLLECTIONS.map((c) => {
          const n = counts[c.key as keyof typeof counts];
          return (
            <Link key={c.key} href={`/admin/babyland/${c.key}`} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{c.label}</CardTitle>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {typeof n === "number" ? `${n} registos` : ""}
                    </span>
                  </div>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                    Abrir →
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
