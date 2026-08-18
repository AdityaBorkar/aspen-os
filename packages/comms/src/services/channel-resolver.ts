import { commsChannel } from "#/db-schemas";
import { getSetting } from "#/services/settings-service";
import type { EnsureDefaultsInput, CommsChannel } from "#/types";
import { SETTING_KEYS } from "#/utils/constants";

import type { ChannelType, MasterEntityType } from "@aspen-os/constants";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { record, safeParse, string } from "valibot";

export interface ChannelScope {
  entityId: string;
  entityType: MasterEntityType;
}

export interface ChannelResolverDeps {
  db: PostgresJsDatabase;
  ensureDefaults: {
    run: (input: { input: EnsureDefaultsInput }) => Promise<{ materialized: number }>;
  };
}

export async function resolveDefaultChannel(
  type: ChannelType,
  scope: ChannelScope,
  deps: ChannelResolverDeps,
): Promise<CommsChannel | null> {
  const overrideId = await resolveOverrideId(type, deps.db);
  if (overrideId) {
    const overridden = await fetchActiveById(overrideId, scope, deps.db);
    if (overridden) {
      return overridden;
    }
  }

  const current = await fetchActiveDefault(type, scope, deps.db);
  if (current) {
    return current;
  }

  await deps.ensureDefaults.run({
    input: {
      channelTypes: [type],
      entityId: scope.entityId,
      entityType: scope.entityType,
    },
  });

  return fetchActiveDefault(type, scope, deps.db);
}

async function resolveOverrideId(
  type: ChannelType,
  db: PostgresJsDatabase,
): Promise<string | null> {
  const value = await getSetting(db, SETTING_KEYS.DEFAULT_CHANNELS);
  if (value === null) {
    return null;
  }
  const parsed = safeParse(record(string(), string()), value);
  if (!parsed.success) {
    return null;
  }
  return parsed.output[type] ?? null;
}

async function fetchActiveById(
  id: string,
  scope: ChannelScope,
  db: PostgresJsDatabase,
): Promise<CommsChannel | null> {
  const [row] = await db
    .select()
    .from(commsChannel)
    .where(
      and(
        eq(commsChannel.id, id),
        eq(commsChannel.entityType, scope.entityType),
        eq(commsChannel.entityId, scope.entityId),
        eq(commsChannel.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function fetchActiveDefault(
  type: ChannelType,
  scope: ChannelScope,
  db: PostgresJsDatabase,
): Promise<CommsChannel | null> {
  const [row] = await db
    .select()
    .from(commsChannel)
    .where(
      and(
        eq(commsChannel.type, type),
        eq(commsChannel.entityType, scope.entityType),
        eq(commsChannel.entityId, scope.entityId),
        eq(commsChannel.isDefault, true),
        eq(commsChannel.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}
