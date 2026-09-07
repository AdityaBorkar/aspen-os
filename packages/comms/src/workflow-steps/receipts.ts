import { commsMessage } from "#/db-schemas";
import { MESSAGE_EVENTS } from "#/pubsub";
import { runInTenantContext, tenantIdFromMetadata } from "#/services/tenant";

import type { DatabaseUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface ProviderReceiptInput {
  error?: string;
  providerMessageId: string;
  status: "delivered" | "failed";
}

export interface ReceiptDeps {
  db: DatabaseUnit;
  pubsub: PubSubUnit;
}

/**
 * Correlates a provider receipt (webhook payload from SES SNS, Twilio status
 * callback, or Meta WhatsApp delivery status) with the outbound message by its
 * provider-side id. The host app wires adapter-specific webhook routes to this
 * handler; the receipt body is parsed at the route boundary before being passed
 * here.
 */
export async function handleProviderReceipt(
  input: ProviderReceiptInput,
  deps: ReceiptDeps,
): Promise<boolean> {
  const [message] = await deps.db.db
    .select()
    .from(commsMessage)
    .where(eq(commsMessage.providerMessageId, input.providerMessageId))
    .limit(1);

  if (!message) {
    return false;
  }

  const tenantId = message.tenantId ?? tenantIdFromMetadata(message.metadata);
  if (!tenantId) {
    return false;
  }
  await runInTenantContext(deps.db, tenantId, async (db) => {
    if (input.status === "delivered") {
      await markDelivered(db, message);
      await deps.pubsub.publish(MESSAGE_EVENTS.DELIVERED, {
        at: new Date().toISOString(),
        messageId: message.id,
      });
    } else {
      await markFailed(db, message, input.error ?? "Provider reported a delivery failure.");
      await deps.pubsub.publish(MESSAGE_EVENTS.FAILED, {
        attempts: message.attempts + 1,
        error: input.error ?? "Provider reported a delivery failure.",
        messageId: message.id,
      });
    }
  });

  return true;
}

async function markDelivered(
  db: PostgresJsDatabase,
  message: typeof commsMessage.$inferSelect,
): Promise<void> {
  const at = new Date();
  await db
    .update(commsMessage)
    .set({ deliveredAt: at, status: "delivered" })
    .where(and(eq(commsMessage.id, message.id), inArray(commsMessage.status, ["sent", "sending"])));
}

async function markFailed(
  db: PostgresJsDatabase,
  message: typeof commsMessage.$inferSelect,
  error: string,
): Promise<void> {
  await db
    .update(commsMessage)
    // SAFETY: atomic increment avoids lost updates on concurrent receipts.
    .set({ attempts: sql`${commsMessage.attempts} + 1`, lastError: error, status: "failed" })
    .where(and(eq(commsMessage.id, message.id), ne(commsMessage.status, "delivered")));
}
