import { dmsShare } from "#/db-schemas";

import type { InferSchemaOutput, PubSubUnit, StandardSchema } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { nullable, object, string } from "valibot";

export interface ContactShareBridgeDeps {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

/**
 * Contacts moved to masters (`p.masters.contacts`); DMS shares still accept
 * `contact` grantees holding masters contact ids. Removing a masters contact
 * must revoke every grant immediately (previously done inline by
 * `dms.contact.remove`), so DMS subscribes to the masters removal event.
 */
const MasterContactRemovedEventSchema = object({
  contactId: string(),
  entityId: nullable(string()),
  entityType: nullable(string()),
  reason: string(),
});

async function handleContactRemoved(
  event: { contactId: string },
  { db }: ContactShareBridgeDeps,
): Promise<void> {
  await db
    .delete(dmsShare)
    .where(and(eq(dmsShare.grantee_id, event.contactId), eq(dmsShare.grantee_type, "contact")));
}

export async function registerContactShareBridge(deps: ContactShareBridgeDeps): Promise<string[]> {
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

  await subscribe("masters:contact_removed", MasterContactRemovedEventSchema, (data) =>
    handleContactRemoved(data, deps),
  );

  return ["masters:contact_removed"];
}

export async function unregisterContactShareBridge(
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
