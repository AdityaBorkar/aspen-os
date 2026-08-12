import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { COMPLIANCE_EVENTS } from "../pubsub";
import {
  CRON_SCHEDULES,
  DEFAULT_ESCALATION_DAYS,
  SCHEDULED_JOBS,
} from "../utils/constants";
import { dashboard, documents } from "../workflows";
import {
  daysSince,
  daysUntil,
  deriveExpiryStatus,
  deriveOverdueStatus,
  isSnoozed,
  shouldEscalate,
  shouldNotify,
} from "./status-derivation";

interface KvStoreLike {
  del(key: string): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

export interface ReminderEngineDeps {
  audit: AuditUnit;
  cacheTtl: number;
  db: NodePgDatabase;
  kvStore: KvStoreLike | null;
  pubsub: PubSubUnit;
}

export async function registerReminderSchedules({
  pubsub,
}: Pick<ReminderEngineDeps, "pubsub">): Promise<void> {
  await pubsub.schedule(
    SCHEDULED_JOBS.DAILY_EXPIRY_SCAN,
    CRON_SCHEDULES.DAILY_EXPIRY_SCAN,
    {},
    { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
  );

  await pubsub.schedule(
    SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
    CRON_SCHEDULES.DAILY_STATUS_TRANSITION,
    {},
    { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
  );

  await pubsub.schedule(
    SCHEDULED_JOBS.DAILY_ESCALATION,
    CRON_SCHEDULES.DAILY_ESCALATION,
    {},
    { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
  );

  await pubsub.schedule(
    SCHEDULED_JOBS.WEEKLY_SUMMARY,
    CRON_SCHEDULES.WEEKLY_SUMMARY,
    {},
    { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
  );
}

export async function registerReminderHandlers(
  deps: ReminderEngineDeps,
): Promise<string[]> {
  const topics: string[] = [];

  await deps.pubsub.subscribe(SCHEDULED_JOBS.DAILY_EXPIRY_SCAN, async () => {
    await scanExpiringAndDueDocuments(deps);
  });
  topics.push(SCHEDULED_JOBS.DAILY_EXPIRY_SCAN);

  await deps.pubsub.subscribe(
    SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
    async () => {
      await transitionExpiredAndOverdueDocuments(deps);
    },
  );
  topics.push(SCHEDULED_JOBS.DAILY_STATUS_TRANSITION);

  await deps.pubsub.subscribe(SCHEDULED_JOBS.DAILY_ESCALATION, async () => {
    await scanEscalations(deps);
  });
  topics.push(SCHEDULED_JOBS.DAILY_ESCALATION);

  await deps.pubsub.subscribe(SCHEDULED_JOBS.WEEKLY_SUMMARY, async () => {
    await generateWeeklySummary(deps);
  });
  topics.push(SCHEDULED_JOBS.WEEKLY_SUMMARY);

  return topics;
}

export async function unregisterReminderEngine(
  topics: string[],
  { pubsub }: Pick<ReminderEngineDeps, "pubsub">,
): Promise<void> {
  for (const topic of topics) {
    await pubsub.unsubscribe(topic);
  }
}

export async function scanExpiringAndDueDocuments(
  deps: ReminderEngineDeps,
): Promise<number> {
  const startTime = Date.now();
  let recordsProcessed = 0;
  let errors = 0;

  try {
    const docs = await documents.getActiveDocumentsForReminders.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    for (const doc of docs) {
      if (isSnoozed(doc.snoozedUntil)) continue;

      const reminderDays = (doc.reminderDays as number[] | null) ?? [
        90, 60, 30, 7,
      ];

      if (doc.expiryDate) {
        const daysUntilExpiry = daysUntil(doc.expiryDate);
        if (daysUntilExpiry !== null && daysUntilExpiry > 0) {
          if (shouldNotify(reminderDays, doc.lastNotifiedAt, daysUntilExpiry)) {
            await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
              daysUntilExpiry,
              documentId: doc.id,
              sourceEntityId: doc.sourceEntityId,
              sourceModule: doc.sourceModule,
            });

            await documents.updateNotifiedAt.run(
              { id: doc.id },
              { db: deps.db, pubsub: deps.pubsub },
            );

            await deps.audit.write({
              action: "reminder_sent",
              entityId: doc.id,
              entityType: "compliance_document",
              metadata: { daysUntilExpiry, threshold: "expiry" },
            });

            recordsProcessed++;
          }
        }
      }

      if (doc.dueDate && !doc.completedAt) {
        const daysUntilDue = daysUntil(doc.dueDate);
        if (daysUntilDue !== null && daysUntilDue > 0) {
          if (shouldNotify(reminderDays, doc.lastNotifiedAt, daysUntilDue)) {
            await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_DUE, {
              daysUntilDue,
              documentId: doc.id,
              sourceEntityId: doc.sourceEntityId,
              sourceModule: doc.sourceModule,
            });

            await documents.updateNotifiedAt.run(
              { id: doc.id },
              { db: deps.db, pubsub: deps.pubsub },
            );

            await deps.audit.write({
              action: "reminder_sent",
              entityId: doc.id,
              entityType: "compliance_document",
              metadata: { daysUntilDue, threshold: "due" },
            });

            recordsProcessed++;
          }
        }
      }
    }
  } catch {
    errors++;
  }

  await deps.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
    errors,
    executionTime: Date.now() - startTime,
    jobName: SCHEDULED_JOBS.DAILY_EXPIRY_SCAN,
    recordsProcessed,
  });

  return recordsProcessed;
}

export async function transitionExpiredAndOverdueDocuments(
  deps: ReminderEngineDeps,
): Promise<number> {
  const startTime = Date.now();
  let recordsProcessed = 0;
  let errors = 0;

  try {
    const docs = await documents.getExpiredAndOverdueDocuments.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    for (const doc of docs) {
      let newStatus: string | null = null;

      const expiryStatus = deriveExpiryStatus(
        doc.verificationStatus,
        doc.expiryDate,
      );
      if (expiryStatus) newStatus = expiryStatus;

      const overdueStatus = deriveOverdueStatus(
        doc.verificationStatus,
        doc.dueDate,
        doc.completedAt,
      );
      if (overdueStatus && !newStatus) newStatus = overdueStatus;

      if (newStatus) {
        await documents.updateStatus.run(
          {
            id: doc.id,
            performedBy: null,
            status: newStatus as "expired" | "overdue",
          },
          { audit: deps.audit, db: deps.db, pubsub: deps.pubsub },
        );

        if (newStatus === "expired") {
          await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRED, {
            category: doc.category,
            documentId: doc.id,
            sourceEntityId: doc.sourceEntityId,
            sourceModule: doc.sourceModule,
          });
        } else if (newStatus === "overdue") {
          const daysOverdue = doc.dueDate
            ? Math.abs(daysUntil(doc.dueDate) ?? 0)
            : 0;
          await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_OVERDUE, {
            category: doc.category,
            daysOverdue,
            documentId: doc.id,
            sourceEntityId: doc.sourceEntityId,
            sourceModule: doc.sourceModule,
          });
        }

        recordsProcessed++;
      }
    }
  } catch {
    errors++;
  }

  await deps.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
    errors,
    executionTime: Date.now() - startTime,
    jobName: SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
    recordsProcessed,
  });

  return recordsProcessed;
}

export async function scanEscalations(
  deps: ReminderEngineDeps,
): Promise<number> {
  const startTime = Date.now();
  let recordsProcessed = 0;
  let errors = 0;

  try {
    const docs = await documents.getEscalatableDocuments.run(
      {},
      { db: deps.db, pubsub: deps.pubsub },
    );

    for (const doc of docs) {
      const escalationDays =
        (doc.escalationDays as number[] | null) ?? DEFAULT_ESCALATION_DAYS;

      const targetDate = doc.expiryDate ?? doc.dueDate;
      if (!targetDate) continue;

      const daysSinceTarget = daysSince(targetDate);
      if (daysSinceTarget === null) continue;

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

        recordsProcessed++;
      }
    }
  } catch {
    errors++;
  }

  await deps.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
    errors,
    executionTime: Date.now() - startTime,
    jobName: SCHEDULED_JOBS.DAILY_ESCALATION,
    recordsProcessed,
  });

  return recordsProcessed;
}

export async function generateWeeklySummary(
  deps: ReminderEngineDeps,
): Promise<void> {
  const startTime = Date.now();
  const kvStore = deps.kvStore;

  const summary = await dashboard.getSummary.run(
    {},
    {
      config: {
        cacheTtl: deps.cacheTtl,
        kvStore: kvStore
          ? {
              del: (key: string) => kvStore.del(key),
              get: (key: string) => kvStore.get<unknown>(key),
              set: (key: string, value: unknown, ttl?: number) =>
                kvStore.set(key, value, ttl),
            }
          : undefined,
      },
      db: deps.db,
      pubsub: deps.pubsub,
    },
  );

  await deps.pubsub.publish(COMPLIANCE_EVENTS.WEEKLY_SUMMARY, {
    summary: {
      activeObligations: summary.activeObligations,
      documentsGenerated: summary.documentsGenerated30d,
      expired: summary.expired,
      expiringSoon: summary.expiringSoon,
      overdue: summary.overdue,
      total: summary.total,
      verified: summary.verified,
    },
  });

  await deps.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
    errors: 0,
    executionTime: Date.now() - startTime,
    jobName: SCHEDULED_JOBS.WEEKLY_SUMMARY,
    recordsProcessed: 1,
  });
}
