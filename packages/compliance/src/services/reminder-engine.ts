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
  | "assigned_to"
  | "completed_at"
  | "created_by"
  | "due_date"
  | "expiry_date"
  | "id"
  | "last_notified_at"
  | "reminder_days"
  | "snoozed_until"
  | "source_entity_id"
  | "source_module"
>;

async function notifyDoc(input: {
  days: number;
  deps: ReminderEngineDeps;
  doc: ReminderDoc;
  kind: "expiry" | "due";
}): Promise<void> {
  const { days, deps, doc, kind } = input;
  const isExpiry = kind === "expiry";
  const recipient = recipientFor(doc) ?? undefined;
  const base = {
    documentId: doc.id,
    recipient,
    sourceEntityId: doc.source_entity_id,
    sourceModule: doc.source_module,
  };
  await (isExpiry
    ? deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
        ...base,
        daysUntilExpiry: days,
      })
    : deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_DUE, {
        ...base,
        daysUntilDue: days,
      }));
  await documents.updateNotifiedAt.run({ id: doc.id }, { db: deps.db, pubsub: deps.pubsub });
  await deps.audit.write({
    action: "reminder_sent",
    entityId: doc.id,
    entityType: "document",
    metadata: isExpiry
      ? { daysUntilExpiry: days, threshold: "expiry" }
      : { daysUntilDue: days, threshold: "due" },
  });
}

function throwOnFailures(settled: PromiseSettledResult<number>[], unit: string): number {
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
    throw Object.assign(new Error(`${failures} ${unit} failed`), { failures, processed });
  }
  return processed;
}

export async function scanExpiringAndDueDocuments(deps: ReminderEngineDeps): Promise<number> {
  return runJob(deps, SCHEDULED_JOBS.DAILY_EXPIRY_SCAN, async () => {
    const docs = await documents.getActiveDocumentsForReminders.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    const settled = await Promise.allSettled(
      docs.map(async (doc: ComplianceDocument) => {
        if (isSnoozed(doc.snoozed_until)) {
          return 0;
        }

        const reminderDays = doc.reminder_days ?? [...DEFAULT_REMINDER_DAYS_EXPIRY];

        let expiryCandidate: number | null = null;
        if (doc.expiry_date) {
          const daysUntilExpiry = daysUntil(doc.expiry_date);
          if (
            daysUntilExpiry !== null &&
            daysUntilExpiry >= 0 &&
            shouldNotify(reminderDays, doc.last_notified_at, daysUntilExpiry)
          ) {
            expiryCandidate = daysUntilExpiry;
          }
        }

        let dueCandidate: number | null = null;
        if (doc.due_date && !doc.completed_at) {
          const daysUntilDue = daysUntil(doc.due_date);
          if (
            daysUntilDue !== null &&
            daysUntilDue >= 0 &&
            shouldNotify(reminderDays, doc.last_notified_at, daysUntilDue)
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
    return throwOnFailures(settled, "reminder notification(s)");
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
      docs.map(async (doc: ComplianceDocument) => {
        // Expiry dominates overdue; deriveOverdueStatus already pins expired.
        const newStatus =
          deriveExpiryStatus(doc.verification_status, doc.expiry_date) ??
          deriveOverdueStatus(doc.verification_status, doc.due_date, doc.completed_at);
        if (!newStatus || newStatus === doc.verification_status) {
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
            sourceEntityId: doc.source_entity_id,
            sourceModule: doc.source_module,
          });
        } else if (newStatus === VERIFICATION_STATUS.OVERDUE) {
          const daysOverdue = doc.due_date ? Math.abs(daysUntil(doc.due_date) ?? 0) : 0;
          await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_OVERDUE, {
            category: doc.category,
            daysOverdue,
            documentId: doc.id,
            sourceEntityId: doc.source_entity_id,
            sourceModule: doc.source_module,
          });
        }

        return 1;
      }),
    );
    return throwOnFailures(settled, "status transition(s)");
  });
}

export async function scanEscalations(deps: ReminderEngineDeps): Promise<number> {
  return runJob(deps, SCHEDULED_JOBS.DAILY_ESCALATION, async () => {
    const docs = await documents.getEscalatableDocuments.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    const settled = await Promise.allSettled(
      docs.map(async (doc: ComplianceDocument) => {
        const escalationDays = doc.escalation_days ?? [...DEFAULT_ESCALATION_DAYS];

        const targetDate = doc.expiry_date ?? doc.due_date;
        if (!targetDate) {
          return 0;
        }

        const daysSinceTarget = daysSince(targetDate);
        if (daysSinceTarget === null) {
          return 0;
        }

        const escalationLevel = shouldEscalate(
          escalationDays,
          doc.last_escalated_at,
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
            entityType: "document",
            metadata: { daysSinceExpiry: daysSinceTarget, escalationLevel },
          });

          return 1;
        }

        return 0;
      }),
    );
    return throwOnFailures(settled, "escalation(s)");
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

function recipientFor(doc: {
  assigned_to: string | null;
  created_by: string;
}): RecipientRef | null {
  const id = doc.assigned_to ?? doc.created_by;
  if (!id || id === SYSTEM_ACTOR) {
    return null;
  }
  return { id, type: "user" };
}
