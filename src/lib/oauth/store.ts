import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthConnections } from "@/lib/db/schema";
import { decryptToken, encryptToken } from "./crypto";

export type OAuthProvider = "google" | "microsoft";

export type OAuthConnectionRow = {
  id: string;
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  externalEmail: string | null;
  defaultPillarId: string | null;
  lastSyncedAt: Date | null;
};

/** Read the current user's connection to a given provider, or null. */
export async function getConnection(
  userId: string,
  provider: OAuthProvider,
): Promise<OAuthConnectionRow | null> {
  const [row] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...(row as OAuthConnectionRow),
    accessToken: decryptToken(row.accessToken),
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken) : null,
  };
}

/** Insert or update a user's connection. Called from OAuth callbacks. */
export async function upsertConnection(input: {
  userId: string;
  provider: OAuthProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  externalEmail: string | null;
}): Promise<void> {
  const encAccess = encryptToken(input.accessToken);
  const encRefresh = input.refreshToken ? encryptToken(input.refreshToken) : null;
  await db
    .insert(oauthConnections)
    .values({
      userId: input.userId,
      provider: input.provider,
      accessToken: encAccess,
      refreshToken: encRefresh,
      expiresAt: input.expiresAt,
      scope: input.scope,
      externalEmail: input.externalEmail,
    })
    .onConflictDoUpdate({
      target: [oauthConnections.userId, oauthConnections.provider],
      set: {
        accessToken: encAccess,
        refreshToken: encRefresh,
        expiresAt: input.expiresAt,
        scope: input.scope,
        externalEmail: input.externalEmail,
        updatedAt: new Date(),
      },
    });
}

/** Update just the tokens after a refresh. Doesn't touch defaultPillarId etc. */
export async function updateTokens(
  userId: string,
  provider: OAuthProvider,
  accessToken: string,
  expiresAt: Date | null,
  refreshToken: string | null = null,
): Promise<void> {
  await db
    .update(oauthConnections)
    .set({
      accessToken: encryptToken(accessToken),
      expiresAt,
      ...(refreshToken ? { refreshToken: encryptToken(refreshToken) } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider),
      ),
    );
}

export async function setSyncMetadata(
  userId: string,
  provider: OAuthProvider,
  patch: {
    defaultPillarId?: string | null;
    lastSyncedAt?: Date | null;
  },
): Promise<void> {
  await db
    .update(oauthConnections)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider),
      ),
    );
}

export async function deleteConnection(
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  await db
    .delete(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider),
      ),
    );
}
