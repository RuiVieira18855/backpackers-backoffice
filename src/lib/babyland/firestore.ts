import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Ligação ao Firestore da BabyLand (projeto `appbabyland`).
 *
 * A BabyLand é uma app Firebase e o resto do grupo vive em Supabase. Em vez de
 * migrar a app, o Outpost fala com o Firestore pelo Admin SDK: o backoffice é um
 * só, e a app não muda de infraestrutura.
 *
 * Credencial: variável de ambiente `BABYLAND_SERVICE_ACCOUNT` com o JSON da service
 * account (Firebase Console → Definições do projeto → Contas de serviço → Gerar nova
 * chave privada). Em Vercel, colar o JSON inteiro numa única linha.
 */
const APP_NAME = "babyland";

let cached: Firestore | null = null;

export class BabylandNotConfiguredError extends Error {
  constructor() {
    super(
      "BABYLAND_SERVICE_ACCOUNT não está definida. Sem ela o Outpost não consegue ler nem escrever no Firestore da BabyLand.",
    );
    this.name = "BabylandNotConfiguredError";
  }
}

export function isBabylandConfigured(): boolean {
  return Boolean(process.env.BABYLAND_SERVICE_ACCOUNT?.trim());
}

function readServiceAccount() {
  const raw = process.env.BABYLAND_SERVICE_ACCOUNT?.trim();
  if (!raw) throw new BabylandNotConfiguredError();
  // Aceita JSON directo ou codificado em base64 (mais seguro de colar em painéis).
  const json = raw.startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    // Em painéis de ambiente as quebras de linha vêm escapadas.
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

export function babylandDb(): Firestore {
  if (cached) return cached;
  const existing = getApps().find((a) => a.name === APP_NAME);
  const app =
    existing ??
    initializeApp({ credential: cert(readServiceAccount()) }, APP_NAME);
  cached = getFirestore(app);
  return cached;
}

export type BabylandDoc = Record<string, unknown> & { id: string };

function normalise(value: unknown): unknown {
  // Timestamps do Firestore não atravessam a fronteira servidor/cliente.
  if (value && typeof value === "object" && "toDate" in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return d.toISOString();
  }
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normalise(v),
      ]),
    );
  }
  return value;
}

export async function listDocs(
  collection: string,
  opts: { limit?: number } = {},
): Promise<BabylandDoc[]> {
  const snap = await babylandDb()
    .collection(collection)
    .limit(opts.limit ?? 2000)
    .get();
  return snap.docs.map((d) => ({
    ...(normalise(d.data()) as Record<string, unknown>),
    id: d.id,
  }));
}

export async function countDocs(collection: string): Promise<number> {
  const snap = await babylandDb().collection(collection).count().get();
  return snap.data().count;
}

export async function getDocById(
  collection: string,
  id: string,
): Promise<BabylandDoc | null> {
  const snap = await babylandDb().collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return { ...(normalise(snap.data()) as Record<string, unknown>), id: snap.id };
}

export async function saveDoc(
  collection: string,
  id: string | null,
  data: Record<string, unknown>,
): Promise<string> {
  const db = babylandDb();
  const payload = { ...data, updatedAt: new Date().toISOString() };
  if (id) {
    await db.collection(collection).doc(id).set(payload, { merge: true });
    return id;
  }
  const ref = await db
    .collection(collection)
    .add({ ...payload, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function removeDoc(
  collection: string,
  id: string,
): Promise<void> {
  await babylandDb().collection(collection).doc(id).delete();
}
