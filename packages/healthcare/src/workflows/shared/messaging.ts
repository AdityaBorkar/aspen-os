import { healthcareMessageLog, healthcareMessageOptout } from "#/db-schemas/records";
import { HEALTHCARE_OPT_OUT_MESSAGE } from "#/integrations/comms";

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type HealthcareDB = PostgresJsDatabase;

export type OutboundChannel = "print" | "sms" | "whatsapp";

export const OPT_OUT_BLOCK_MESSAGE = HEALTHCARE_OPT_OUT_MESSAGE;

export async function assertRecipientOptedIn(
  db: HealthcareDB,
  branchId: string,
  to: string,
): Promise<void> {
  // Single delivery surface is comms (comms.message + comms.preference + sweeper
  // outbox). This branch-scoped blocklist is the deprecated healthcare mirror of
  // comms.preference: comms.healthcare-bridge syncs healthcare opt-outs into
  // comms.preference, and every healthcare sender must keep calling this gate
  // before queueing. Do not add a second gate elsewhere.
  const blocked = await db
    .select({ id: healthcareMessageOptout.id })
    .from(healthcareMessageOptout)
    .where(and(eq(healthcareMessageOptout.branch_id, branchId), eq(healthcareMessageOptout.to, to)))
    .limit(10);
  if (blocked.length > 0) {
    throw new Error(OPT_OUT_BLOCK_MESSAGE);
  }
}

export interface QueuedMessage {
  branchId: string;
  channel: OutboundChannel;
  patientId: string | null;
  template?: string;
  to: string;
}

export async function queueOutboundMessage(
  db: HealthcareDB,
  message: QueuedMessage,
): Promise<typeof healthcareMessageLog.$inferSelect> {
  const [row] = await db
    .insert(healthcareMessageLog)
    .values({
      branch_id: message.branchId,
      channel: message.channel,
      patient_id: message.patientId,
      status: "queued",
      template: message.template,
      to: message.to,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to queue message.");
  }
  return row;
}

export function assertShareConfirmed(recipientConfirm: string): void {
  if (recipientConfirm !== "yes") {
    throw new Error("Recipient must confirm before sharing; obtain confirmation and retry");
  }
}
