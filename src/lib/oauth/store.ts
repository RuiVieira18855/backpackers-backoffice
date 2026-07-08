import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthConnections } from "@/lib/db/schema";

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
  return (row as OAuthConnectionRow | undefined) ?? null;
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
  await db
    .insert(oauthConnections)
    .values({
      userId: input.userId,
      provider: input.provider,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      scope: input.scope,
      externalEmail: input.externalEmail,
    })
    .onConflictDoUpdate({
      target: [oauthConnections.userId, oauthConnections.provider],
      set: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
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
      accessToken,
      expiresAt,
      ...(refreshToken ? { refreshToken } : {}),
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
