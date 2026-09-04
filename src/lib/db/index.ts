import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Supabase Transaction pooler (port 6543) does NOT support prepared
 * statements — `prepare: false` is required.
 *
 * O pool é guardado em globalThis de propósito. Em `next dev`, cada
 * recompilação com Turbopack reavalia este módulo e criava um pool novo, sem
 * fechar o anterior. Ao fim de algumas edições havia dezenas de pools a
 * competir pelas ligações do pooler, e as páginas que disparam muitas queries
 * em paralelo (o dashboard dispara treze) ficavam à espera de uma ligação
 * livre até rebentar o timeout de 15 s. Em produção o módulo só é avaliado uma
 * vez e isto não muda nada.
 */
const globalForDb = globalThis as unknown as {
  __outpostPg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__outpostPg ??
  postgres(connectionString, {
    prepare: false,
    // O dashboard tem treze queries em paralelo. Com o default (10) três
    // ficavam sempre em fila à espera de ligação.
    max: 16,
    // Não deixar ligações ociosas presas ao pooler entre sessões de trabalho.
    idle_timeout: 20,
    // Falhar depressa e com mensagem clara em vez de pendurar até aos 15 s.
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__outpostPg = client;
}

export const db = drizzle(client, { schema });

export type Db = typeof db;
