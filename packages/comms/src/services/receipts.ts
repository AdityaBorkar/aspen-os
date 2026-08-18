import { commsMessage } from "#/db-schemas";
import { MESSAGE_EVENTS } from "#/pubsub";

import type { DatabaseUnit, PubSubUnit } from "@aspen-os/platform/server";
import { isGlobalTenantId } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { object, optional, safeParse, string } from "valibot";

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

  const tenantId = tenantIdFor(message);
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
    .where(and(eq(commsMessage.id, message.id), eq(commsMessage.status, "sent")));
}

async function markFailed(
  db: PostgresJsDatabase,
  message: typeof commsMessage.$inferSelect,
  error: string,
): Promise<void> {
  const attempts = message.attempts + 1;
  await db
    .update(commsMessage)
    .set({ attempts, lastError: error, status: "failed" })
    .where(eq(commsMessage.id, message.id));
}

function tenantIdFor(message: typeof commsMessage.$inferSelect): string {
  const parsed = safeParse(object({ tenantId: optional(string()) }), message.metadata ?? {});
  return parsed.success && parsed.output.tenantId ? parsed.output.tenantId : "default";
}

async function runInTenantContext<TValue>(
  dbUnit: DatabaseUnit,
  tenantId: string,
  fn: (db: PostgresJsDatabase) => Promise<TValue>,
): Promise<TValue> {
  if (isGlobalTenantId(tenantId)) {
    return fn(dbUnit.controlPlaneDb);
  }
  if (dbUnit.tenancyMode === "isolated") {
    const db = await dbUnit.getTenantDb(tenantId);
    return fn(db);
  }
  // SAFETY: runWithTenant hands the callback a session-scoped drizzle instance
  // Whose surface is a PostgresJsDatabase; the generic schema parameter is erased.
  return dbUnit.runWithTenant(tenantId, (db) => fn(db));
}
