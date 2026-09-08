import { calendarReminder } from "#/db-schemas";
import { REMINDER_CHANNEL, REMINDER_TARGET, REMINDER_TYPE } from "#/utils/constants";

import type { InferSchemaOutput, PubSubUnit, StandardSchema } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { array, nullable, number, object, optional, string } from "valibot";

export interface ComplianceBridgeDeps {
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

export interface ComplianceBridgeOptions {
  enabled?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(["archived", "renewed"]);

const ComplianceDocumentFactSchema = object({
  assignedTo: nullable(string()),
  createdBy: string(),
  documentId: string(),
  dueDate: nullable(string()),
  expiryDate: nullable(string()),
  reminderDays: optional(nullable(array(number()))),
  snoozedUntil: nullable(string()),
  verificationStatus: optional(string()),
});

const ComplianceDocumentArchivedSchema = object({
  documentId: string(),
});

const ComplianceDocumentDeletedSchema = object({
  documentId: string(),
});

async function deletePendingComplianceReminders(
  db: PostgresJsDatabase,
  documentId: string,
): Promise<void> {
  await db
    .delete(calendarReminder)
    .where(
      and(
        eq(calendarReminder.target_type, REMINDER_TARGET.COMPLIANCE_DOCUMENT),
        eq(calendarReminder.target_id, documentId),
        eq(calendarReminder.is_sent, false),
      ),
    );
}

async function handleDocumentFact(
  event: {
    assignedTo: string | null;
    createdBy: string;
    documentId: string;
    dueDate: string | null;
    expiryDate: string | null;
    reminderDays?: number[] | null;
    snoozedUntil: string | null;
    verificationStatus?: string;
  },
  { db }: ComplianceBridgeDeps,
): Promise<void> {
  const userIds = [
    ...new Set([event.assignedTo, event.createdBy].filter((id): id is string => Boolean(id))),
  ];

  if (event.verificationStatus && TERMINAL_STATUSES.has(event.verificationStatus)) {
    await deletePendingComplianceReminders(db, event.documentId);
    return;
  }

  if (event.snoozedUntil) {
    const snoozedUntil = new Date(event.snoozedUntil);
    if (!Number.isNaN(snoozedUntil.getTime()) && snoozedUntil.getTime() > Date.now()) {
      await deletePendingComplianceReminders(db, event.documentId);
      return;
    }
  }

  if (userIds.length === 0) {
    await deletePendingComplianceReminders(db, event.documentId);
    return;
  }

  const reminderDays = event.reminderDays ?? [90, 60, 30, 7];
  const validReminderDays = reminderDays.filter((days) => Number.isFinite(days) && days >= 0);

  if (validReminderDays.length === 0) {
    await deletePendingComplianceReminders(db, event.documentId);
    return;
  }

  const targetDates: { date: Date; label: string }[] = [];
  if (event.expiryDate) {
    const expiryDate = new Date(event.expiryDate);
    if (!Number.isNaN(expiryDate.getTime())) {
      targetDates.push({ date: expiryDate, label: "expiry" });
    }
  }
  if (event.dueDate) {
    const dueDate = new Date(event.dueDate);
    if (!Number.isNaN(dueDate.getTime())) {
      const already = targetDates.some((target) => target.date.getTime() === dueDate.getTime());
      if (!already) {
        targetDates.push({ date: dueDate, label: "due" });
      }
    }
  }

  if (targetDates.length === 0) {
    await deletePendingComplianceReminders(db, event.documentId);
    return;
  }

  const rows = userIds.flatMap((userId) =>
    targetDates.flatMap(({ date: targetDate, label }) =>
      validReminderDays.map((days) => ({
        channel: REMINDER_CHANNEL.PUBSUB,
        created_by: "compliance-bridge",
        message: `Compliance document ${label} in ${days} day${days === 1 ? "" : "s"}`,
        remind_at: new Date(targetDate.getTime() - days * DAY_MS),
        target_id: event.documentId,
        target_type: REMINDER_TARGET.COMPLIANCE_DOCUMENT,
        type: REMINDER_TYPE.DUE_DATE,
        user_id: userId,
      })),
    ),
  );

  await db.transaction(async (tx) => {
    await deletePendingComplianceReminders(tx, event.documentId);
    if (rows.length > 0) {
      await tx.insert(calendarReminder).values(rows);
    }
  });
}

async function handleDocumentArchived(
  event: { documentId: string },
  { db }: ComplianceBridgeDeps,
): Promise<void> {
  await db
    .delete(calendarReminder)
    .where(
      and(
        eq(calendarReminder.target_type, REMINDER_TARGET.COMPLIANCE_DOCUMENT),
        eq(calendarReminder.target_id, event.documentId),
      ),
    );
}

export async function registerComplianceBridge(
  deps: ComplianceBridgeDeps,
  options?: ComplianceBridgeOptions,
): Promise<string[]> {
  if (options?.enabled === false) {
    return [];
  }

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

  await subscribe("compliance:document_expiring", ComplianceDocumentFactSchema, (data) =>
    handleDocumentFact(data, deps),
  );
  await subscribe("compliance:document_due", ComplianceDocumentFactSchema, (data) =>
    handleDocumentFact(data, deps),
  );
  await subscribe("compliance:document_archived", ComplianceDocumentArchivedSchema, (data) =>
    handleDocumentArchived(data, deps),
  );
  await subscribe("compliance:document_deleted", ComplianceDocumentDeletedSchema, (data) =>
    handleDocumentArchived(data, deps),
  );

  return [
    "compliance:document_expiring",
    "compliance:document_due",
    "compliance:document_archived",
    "compliance:document_deleted",
  ];
}

export async function unregisterComplianceBridge(
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
