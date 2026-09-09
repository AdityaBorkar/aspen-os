import { dmsEntityLabel, dmsLabelCache } from "#/db-schemas";

import type { InferSchemaOutput, PubSubUnit, StandardSchema } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nullable, object, string } from "valibot";

export interface LabelBridgeDeps {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

/**
 * Event-driven projection of the masters label taxonomy.
 * DMS never reads `master_label` directly — label names for search and
 * view conditions come from the local `dms_label_cache`, synced from
 * `masters:label_created / label_updated / label_removed`.
 */
const LabelCreatedEventSchema = object({
  label: object({
    color: nullable(string()),
    id: string(),
    name: string(),
    scopeId: nullable(string()),
    scopeType: nullable(string()),
  }),
});

const LabelUpdatedEventSchema = object({
  label: object({
    id: string(),
    name: string(),
  }),
});

const LabelRemovedEventSchema = object({
  labelId: string(),
});

async function handleLabelCreated(
  event: {
    label: {
      color: string | null;
      id: string;
      name: string;
      scopeId: string | null;
      scopeType: string | null;
    };
  },
  { db }: LabelBridgeDeps,
): Promise<void> {
  await db
    .insert(dmsLabelCache)
    .values({
      color: event.label.color,
      id: event.label.id,
      name: event.label.name,
      scope_id: event.label.scopeId,
      scope_type: event.label.scopeType,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      set: {
        color: event.label.color,
        name: event.label.name,
        scope_id: event.label.scopeId,
        scope_type: event.label.scopeType,
        updated_at: new Date(),
      },
      target: dmsLabelCache.id,
    });
}

async function handleLabelUpdated(
  event: { label: { id: string; name: string } },
  { db }: LabelBridgeDeps,
): Promise<void> {
  await db
    .update(dmsLabelCache)
    .set({ name: event.label.name, updated_at: new Date() })
    .where(eq(dmsLabelCache.id, event.label.id));
}

async function handleLabelRemoved(
  event: { labelId: string },
  { db }: LabelBridgeDeps,
): Promise<void> {
  await db.delete(dmsLabelCache).where(eq(dmsLabelCache.id, event.labelId));
  await db.delete(dmsEntityLabel).where(eq(dmsEntityLabel.label_id, event.labelId));
}

export const LABEL_BRIDGE_TOPICS = [
  "masters:label_created",
  "masters:label_updated",
  "masters:label_removed",
] as const;

export async function registerLabelBridge(deps: LabelBridgeDeps): Promise<string[]> {
  async function subscribe<TSchema extends StandardSchema>(
    topic: string,
    schema: TSchema,
    handler: (data: InferSchemaOutput<TSchema>) => Promise<void>,
  ): Promise<void> {
    await deps.pubsub.subscribe(topic, async (message) => {
      const result = await schema["~standard"].validate(message.data);
      if (!result.issues) {
        await handler(result.value);
      }
    });
  }

  await subscribe("masters:label_created", LabelCreatedEventSchema, (data) =>
    handleLabelCreated(data, deps),
  );
  await subscribe("masters:label_updated", LabelUpdatedEventSchema, (data) =>
    handleLabelUpdated(data, deps),
  );
  await subscribe("masters:label_removed", LabelRemovedEventSchema, (data) =>
    handleLabelRemoved(data, deps),
  );

  return [...LABEL_BRIDGE_TOPICS];
}

export async function unregisterLabelBridge(
  topics: string[],
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  await Promise.all(
    topics.map(async (topic) => {
      try {
        await pubsub.unsubscribe(topic);
      } catch {
        // Best-effort cleanup
      }
    }),
  );
}

export interface LabelBridgeOptions {
  enabled?: boolean;
}
