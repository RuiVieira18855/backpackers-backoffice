import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { trailLibrary } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";
import { TrailRows } from "./rows";

type SearchParams = Promise<{
  regiao?: string;
  estado?: string;
  potencial?: string;
  q?: string;
  perto?: string;
  page?: string;
  perPage?: string;
}>;

const REGIOES = [
  "LEIRIA","COIMBRA","SANTAREM","AVEIRO","VISEU","LISBOA","PORTO",
  "GERES","ESTRELA","MADEIRA","ACORES","OUTRAS","INTERNACIONAL",
];

const ESTADOS = [
  "por triar","ideia","a reconhecer","reconhecido","ficha operacional","activo no site",
] as const;

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[150px]";

export default async function AdminTrailsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin_grupo");
  const sp = await searchParams;

  const estadoValido = (ESTADOS as readonly string[]).includes(sp.estado ?? "");

  const filtros: (SQL | undefined)[] = [
    sp.regiao && REGIOES.includes(sp.regiao)
      ? eq(trailLibrary.regiao, sp.regiao)
      : undefined,
    estadoValido
      ? eq(trailLibrary.estado, sp.estado as (typeof ESTADOS)[number])
      : undefined,
    sp.potencial && ["A", "B", "C"].includes(sp.potencial)
      ? eq(trailLibrary.potencial, sp.potencial)
      : undefined,
    // "Perto": a shortlist de reconhecimento sem dormida fora.
    sp.perto === "1"
      ? sql`${trailLibrary.viagemLeiriaMin} <= 60`
      : undefined,
    sp.q
      ? or(
          ilike(trailLibrary.nome, `%${sp.q}%`),
          ilike(trailLibrary.codigo, `%${sp.q}%`),
          ilike(trailLibrary.concelho, `%${sp.q}%`),
        )
      : undefined,
  ];
  const where = filtros.some(Boolean) ? and(...filtros) : undefined;

  const paginacao = parsePagination(sp, 50);

  const [rows, total, porTriar] = await Promise.all([
    db
      .select({
        id: trailLibrary.id,
        nome: trailLibrary.nome,
        codigo: trailLibrary.codigo,
        concelho: trailLibrary.concelho,
        regiao: trailLibrary.regiao,
        distanciaKm: trailLibrary.distanciaKm,
        dificuldade: trailLibrary.dificuldade,
        limiteGrupo: trailLibrary.limiteGrupo,
        viagemLeiriaMin: trailLibrary.viagemLeiriaMin,
        potencial: trailLibrary.potencial,
        estado: trailLibrary.estado,
        avisos: trailLibrary.avisos,
        confianca: trailLibrary.confianca,
      })
      .from(trailLibrary)
      .where(where)
      // Potencial A primeiro, depois os mais perto de Leiria.
      .orderBy(
        sql`CASE ${trailLibrary.potencial} WHEN 'A' THEN 0 WHEN 'B' THEN 1 WHEN 'C' THEN 2 ELSE 3 END`,
        sql`${trailLibrary.viagemLeiriaMin} ASC NULLS LAST`,
        asc(trailLibrary.nome),
      )
      .limit(paginacao.limit)
      .offset(paginacao.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(trailLibrary)
      .where(where ?? sql`true`)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(trailLibrary)
      .where(eq(trailLibrary.estado, "por triar"))
      .then((r) => r[0]?.count ?? 0),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao admin
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          Biblioteca de trilhos
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Percursos de referência de onde saem as caminhadas da agenda. Ainda há{" "}
          <Link href="/admin/trails?estado=por+triar" className="underline">
            {porTriar} por triar
          </Link>
          . Confirmar sempre o código na câmara antes de publicar: a numeração
          PR muda quando um município remodela a rede.
        </p>
      </div>

      <form
        action="/admin/trails"
        method="get"
        className="flex flex-wrap items-end gap-3 border-y border-border py-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Região
          </label>
          <select name="regiao" defaultValue={sp.regiao ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {REGIOES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Estado
          </label>
          <select name="estado" defaultValue={sp.estado ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Potencial
          </label>
          <select name="potencial" defaultValue={sp.potencial ?? ""} className={selectClass}>
            <option value="">Todos</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Procurar
          </label>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="nome, código ou concelho"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[200px]"
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="perto"
            value="1"
            defaultChecked={sp.perto === "1"}
            className="h-4 w-4"
          />
          Até 60 min de Leiria
        </label>
        <Button type="submit" variant="secondary">Filtrar</Button>
        {(sp.regiao || sp.estado || sp.potencial || sp.q || sp.perto) && (
          <Button asChild variant="ghost">
            <Link href="/admin/trails">Limpar</Link>
          </Button>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum trilho encontrado"
          description="Nenhum trilho corresponde a estes filtros."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "trilho" : "trilhos"}
          </p>
          <Card>
            <CardContent className="p-0">
              <TrailRows rows={rows} />
            </CardContent>
          </Card>
          <Pagination
            basePath="/admin/trails"
            searchParams={sp}
            page={paginacao.page}
            pageSize={paginacao.pageSize}
            total={total}
          />
        </>
      )}
    </div>
  );
}
