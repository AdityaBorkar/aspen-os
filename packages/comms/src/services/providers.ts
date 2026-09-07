import { commsProvider } from "#/db-schemas";

import type { ProviderKind } from "@aspen-os/constants";
import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Single home for the "first active provider of these kinds" query, used by
 * the OTP path and channel ensure-defaults. Kinds come from the canonical
 * PROVIDER_KINDS_BY_CHANNEL_TYPE map, never hand-relisted strings.
 */
export async function findFirstActiveProvider(
  db: PostgresJsDatabase,
  kinds: readonly ProviderKind[],
) {
  const [provider] = await db
    .select()
    .from(commsProvider)
    .where(and(eq(commsProvider.isActive, true), inArray(commsProvider.kind, kinds)))
    .orderBy(commsProvider.createdAt)
    .limit(1);
  return provider ?? null;
}
