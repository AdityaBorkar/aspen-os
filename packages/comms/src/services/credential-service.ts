import { commsProvider } from "#/db-schemas";
import type { CommsChannel, CommsProvider, ProviderCredential } from "#/types";

import type { KvStoreUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { record, safeParse, string } from "valibot";

export async function resolveChannelCredential(
  channel: CommsChannel,
  kvStore: KvStoreUnit,
): Promise<ProviderCredential> {
  if (!channel.credentialRef) {
    throw new Error(
      `Channel "${channel.id}" has no credential ref; host channels resolve their provider credential instead.`,
    );
  }
  return resolveCredentialRef(channel.credentialRef, kvStore);
}

export async function resolveProviderCredential(
  provider: CommsProvider,
  kvStore: KvStoreUnit,
): Promise<ProviderCredential> {
  return resolveCredentialRef(provider.credentialRef, kvStore);
}

export async function resolveChannelProvider(
  channel: CommsChannel,
  db: PostgresJsDatabase,
): Promise<CommsProvider | null> {
  if (!channel.providerId) {
    return null;
  }
  const [row] = await db
    .select()
    .from(commsProvider)
    .where(eq(commsProvider.id, channel.providerId))
    .limit(1);
  return row ?? null;
}

async function resolveCredentialRef(
  credentialRef: string,
  kvStore: KvStoreUnit,
): Promise<ProviderCredential> {
  const value = await kvStore.get(credentialRef);
  if (value === null) {
    throw new Error(`Credential "${credentialRef}" not found in kvStore.`);
  }
  const parsed = safeParse(record(string(), string()), value);
  if (!parsed.success) {
    throw new Error(`Credential "${credentialRef}" is not a string record.`);
  }
  return parsed.output;
}
