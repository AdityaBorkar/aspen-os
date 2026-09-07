import type { ComplianceDocument } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import type { RecipientRef } from "#/pubsub";
import {
  CRON_SCHEDULES,
  DEFAULT_ESCALATION_DAYS,
  DEFAULT_REMINDER_DAYS_EXPIRY,
  SCHEDULED_JOBS,
  SYSTEM_ACTOR,
  VERIFICATION_STATUS,
} from "#/utils/constants";
import {
  daysSince,
  daysUntil,
  deriveExpiryStatus,
  deriveOverdueStatus,
  isSnoozed,
  shouldEscalate,
  shouldNotify,
} from "#/workflow-steps/status-derivation";
import { dashboard, documents } from "#/workflows";
import type { WorkflowKvStore } from "#/workflows/utils";

import type { AuditUnit, JsonValue, PubSubUnit } from "@aspen-os/platform/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface ReminderEngineDeps {
  audit: AuditUnit;
  cacheTtl: number;
  db: PostgresJsDatabase;
  kvStore: WorkflowKvStore | null;
  pubsub: PubSubUnit;
}

const RETRY_OPTIONS = { retryBackoff: true, retryDelay: 60, retryLimit: 3 } as const;

const SCHEDULES: { cron: string; topic: string }[] = [
  { cron: CRON_SCHEDULES.DAILY_EXPIRY_SCAN, topic: SCHEDULED_JOBS.DAILY_EXPIRY_SCAN },
  { cron: CRON_SCHEDULES.DAILY_STATUS_TRANSITION, topic: SCHEDULED_JOBS.DAILY_STATUS_TRANSITION },
  { cron: CRON_SCHEDULES.DAILY_ESCALATION, topic: SCHEDULED_JOBS.DAILY_ESCALATION },
  { cron: CRON_SCHEDULES.WEEKLY_SUMMARY, topic: SCHEDULED_JOBS.WEEKLY_SUMMARY },
];

export async function registerReminderSchedules({
  pubsub,
}: Pick<ReminderEngineDeps, "pubsub">): Promise<void> {
  await Promise.all(
    SCHEDULES.map(async ({ cron, topic }) =>
      pubsub.schedule({
        cron,
        data: {},
        options: { ...RETRY_OPTIONS },
        topic,
      }),
    ),
  );
}

export async function registerReminderHandlers(deps: ReminderEngineDeps): Promise<string[]> {
  const handlers: { handler: () => Promise<void>; topic: string }[] = [
    {
      handler: async () => {
        await scanExpiringAndDueDocuments(deps);
      },
      topic: SCHEDULED_JOBS.DAILY_EXPIRY_SCAN,
    },
    {
      handler: async () => {
        await transitionExpiredAndOverdueDocuments(deps);
      },
      topic: SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
    },
    {
      handler: async () => {
        await scanEscalations(deps);
      },
      topic: SCHEDULED_JOBS.DAILY_ESCALATION,
    },
    {
      handler: async () => {
        await generateWeeklySummary(deps);
      },
      topic: SCHEDULED_JOBS.WEEKLY_SUMMARY,
    },
  ];
  await Promise.all(
    handlers.map(async ({ handler, topic }) => deps.pubsub.subscribe(topic, handler)),
  );
  return handlers.map(({ topic }) => topic);
}

export async function unregisterReminderEngine(
  topics: string[],
  { pubsub }: Pick<ReminderEngineDeps, "pubsub">,
): Promise<void> {
  await Promise.all(topics.map(async (topic) => pubsub.unsubscribe(topic)));
}

async function runJob(
  deps: ReminderEngineDeps,
  jobName: string,
  fn: () => Promise<number>,
): Promise<number> {
  const startTime = Date.now();
  let recordsProcessed = 0;
  let errors = 0;
  try {
    recordsProcessed = await fn();
  } catch {
    errors++;
  }
  try {
    await deps.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
      errors,
      executionTime: Date.now() - startTime,
      jobName,
      recordsProcessed,
    });
  } catch {
    errors++;
  }
  return recordsProcessed;
}

type ReminderDoc = Pick<
  ComplianceDocument,
  | "assignedTo"
  | "completedAt"
  | "createdBy"
  | "dueDate"
  | "expiryDate"
  | "id"
  | "lastNotifiedAt"
  | "reminderDays"
  | "snoozedUntil"
  | "sourceEntityId"
  | "sourceModule"
>;

async function notifyDoc(input: {
  days: number;
  deps: ReminderEngineDeps;
  doc: ReminderDoc;
  kind: "expiry" | "due";
}): Promise<void> {
  const { days, deps, doc, kind } = input;
  if (kind === "expiry") {
    await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
      daysUntilExpiry: days,
      documentId: doc.id,
      recipient: recipientFor(doc) ?? undefined,
      sourceEntityId: doc.sourceEntityId,
      sourceModule: doc.sourceModule,
    });
    await documents.updateNotifiedAt.run({ id: doc.id }, { db: deps.db, pubsub: deps.pubsub });
    await deps.audit.write({
      action: "reminder_sent",
      entityId: doc.id,
      entityType: "compliance_document",
      metadata: { daysUntilExpiry: days, threshold: "expiry" },
    });
  } else {
    await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_DUE, {
      daysUntilDue: days,
      documentId: doc.id,
      recipient: recipientFor(doc) ?? undefined,
      sourceEntityId: doc.sourceEntityId,
      sourceModule: doc.sourceModule,
    });
    await documents.updateNotifiedAt.run({ id: doc.id }, { db: deps.db, pubsub: deps.pubsub });
    await deps.audit.write({
      action: "reminder_sent",
      entityId: doc.id,
      entityType: "compliance_document",
      metadata: { daysUntilDue: days, threshold: "due" },
    });
  }
}

export async function scanExpiringAndDueDocuments(deps: ReminderEngineDeps): Promise<number> {
  return runJob(deps, SCHEDULED_JOBS.DAILY_EXPIRY_SCAN, async () => {
    const docs = await documents.getActiveDocumentsForReminders.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    const settled = await Promise.allSettled(
      docs.map(async (doc) => {
        if (isSnoozed(doc.snoozedUntil)) {
          return 0;
        }

        const reminderDays = doc.reminderDays ?? [...DEFAULT_REMINDER_DAYS_EXPIRY];

        let expiryCandidate: number | null = null;
        if (doc.expiryDate) {
          const daysUntilExpiry = daysUntil(doc.expiryDate);
          if (
            daysUntilExpiry !== null &&
            daysUntilExpiry >= 0 &&
            shouldNotify(reminderDays, doc.lastNotifiedAt, daysUntilExpiry)
          ) {
            expiryCandidate = daysUntilExpiry;
          }
        }

        let dueCandidate: number | null = null;
        if (doc.dueDate && !doc.completedAt) {
          const daysUntilDue = daysUntil(doc.dueDate);
          if (
            daysUntilDue !== null &&
            daysUntilDue >= 0 &&
            shouldNotify(reminderDays, doc.lastNotifiedAt, daysUntilDue)
          ) {
            dueCandidate = daysUntilDue;
          }
        }

        // Expiry dominates when both fire in the same scan: one notification
        // per document per scan keeps lastNotifiedAt + audit unambiguous.
        if (expiryCandidate !== null) {
          await notifyDoc({ days: expiryCandidate, deps, doc, kind: "expiry" });
          return 1;
        }
        if (dueCandidate !== null) {
          await notifyDoc({ days: dueCandidate, deps, doc, kind: "due" });
          return 1;
        }
        return 0;
      }),
    );
    let processed = 0;
    let failures = 0;
    for (const result of settled) {
      if (result.status === "fulfilled") {
        processed += result.value;
      } else {
        failures++;
      }
    }
    if (failures > 0) {
      throw Object.assign(new Error(`${failures} reminder notification(s) failed`), {
        failures,
        processed,
      });
    }
    return processed;
  });
}

export async function transitionExpiredAndOverdueDocuments(
  deps: ReminderEngineDeps,
): Promise<number> {
  return runJob(deps, SCHEDULED_JOBS.DAILY_STATUS_TRANSITION, async () => {
    const docs = await documents.getExpiredAndOverdueDocuments.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    const settled = await Promise.allSettled(
      docs.map(async (doc) => {
        // Expiry dominates overdue; deriveOverdueStatus already pins expired.
        const newStatus =
          deriveExpiryStatus(doc.verificationStatus, doc.expiryDate) ??
          deriveOverdueStatus(doc.verificationStatus, doc.dueDate, doc.completedAt);
        if (!newStatus || newStatus === doc.verificationStatus) {
          return 0;
        }

        await documents.updateStatus.run(
          {
            id: doc.id,
            performedBy: SYSTEM_ACTOR,
            status: newStatus,
          },
          { audit: deps.audit, db: deps.db, pubsub: deps.pubsub },
        );

        if (newStatus === VERIFICATION_STATUS.EXPIRED) {
          await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRED, {
            category: doc.category,
            documentId: doc.id,
            sourceEntityId: doc.sourceEntityId,
            sourceModule: doc.sourceModule,
          });
        } else if (newStatus === VERIFICATION_STATUS.OVERDUE) {
          const daysOverdue = doc.dueDate ? Math.abs(daysUntil(doc.dueDate) ?? 0) : 0;
          await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_OVERDUE, {
            category: doc.category,
            daysOverdue,
            documentId: doc.id,
            sourceEntityId: doc.sourceEntityId,
            sourceModule: doc.sourceModule,
          });
        }

        return 1;
      }),
    );
    let processed = 0;
    for (const result of settled) {
      if (result.status === "fulfilled") {
        processed += result.value;
      }
    }
    const failures = settled.filter((outcome) => outcome.status === "rejected").length;
    if (failures > 0) {
      throw Object.assign(new Error(`${failures} status transition(s) failed`), {
        failures,
        processed,
      });
    }
    return processed;
  });
}

export async function scanEscalations(deps: ReminderEngineDeps): Promise<number> {
  return runJob(deps, SCHEDULED_JOBS.DAILY_ESCALATION, async () => {
    const docs = await documents.getEscalatableDocuments.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    const settled = await Promise.allSettled(
      docs.map(async (doc) => {
        const escalationDays = doc.escalationDays ?? [...DEFAULT_ESCALATION_DAYS];

        const targetDate = doc.expiryDate ?? doc.dueDate;
        if (!targetDate) {
          return 0;
        }

        const daysSinceTarget = daysSince(targetDate);
        if (daysSinceTarget === null) {
          return 0;
        }

        const escalationLevel = shouldEscalate(
          escalationDays,
          doc.lastEscalatedAt,
          daysSinceTarget,
        );

        if (escalationLevel !== null) {
          await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ESCALATED, {
            daysSinceExpiry: daysSinceTarget,
            documentId: doc.id,
            escalationLevel,
          });

          await documents.updateEscalatedAt.run(
            { id: doc.id },
            { db: deps.db, pubsub: deps.pubsub },
          );

          await deps.audit.write({
            action: "escalated",
            entityId: doc.id,
            entityType: "compliance_document",
            metadata: { daysSinceExpiry: daysSinceTarget, escalationLevel },
          });

          return 1;
        }

        return 0;
      }),
    );
    let processed = 0;
    for (const result of settled) {
      if (result.status === "fulfilled") {
        processed += result.value;
      }
    }
    const failures = settled.filter((outcome) => outcome.status === "rejected").length;
    if (failures > 0) {
      throw Object.assign(new Error(`${failures} escalation(s) failed`), {
        failures,
        processed,
      });
    }
    return processed;
  });
}

export async function generateWeeklySummary(deps: ReminderEngineDeps): Promise<void> {
  await runJob(deps, SCHEDULED_JOBS.WEEKLY_SUMMARY, async () => {
    // SAFETY: RunOptions.config is typed as JsonValue because the platform serializes it; the summary workflow re-validates via getKvStore before use.
    const kvStoreValue = deps.kvStore as JsonValue;

    const summary = await dashboard.getSummary.run(
      {},
      {
        config: {
          cacheTtl: deps.cacheTtl,
          kvStore: kvStoreValue,
        },
        db: deps.db,
        pubsub: deps.pubsub,
      },
    );

    await deps.pubsub.publish(COMPLIANCE_EVENTS.WEEKLY_SUMMARY, {
      summary: {
        activeObligations: summary.activeObligations,
        // Window: trailing 30 days (documentsGenerated30d).
        documentsGenerated: summary.documentsGenerated30d,
        expired: summary.expired,
        expiringSoon: summary.expiringSoon,
        overdue: summary.overdue,
        total: summary.total,
        verified: summary.verified,
      },
    });

    return 1;
  });
}

function recipientFor(doc: { assignedTo: string | null; createdBy: string }): RecipientRef | null {
  const id = doc.assignedTo ?? doc.createdBy;
  if (!id || id === SYSTEM_ACTOR) {
    return null;
  }
  return { id, type: "user" };
}
