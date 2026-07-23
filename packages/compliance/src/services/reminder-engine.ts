import type { PubSubUnit } from "@aspen-os/platform/server";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  CRON_SCHEDULES,
  DEFAULT_ESCALATION_DAYS,
  SCHEDULED_JOBS,
} from "../constants";
import { COMPLIANCE_EVENTS } from "../event-map";
import type { DashboardWorkflow } from "../workflows/dashboard";
import type { DocumentWorkflow } from "../workflows/document";
import { AuditWriter } from "./audit-writer";
import {
  daysSince,
  daysUntil,
  deriveExpiryStatus,
  deriveOverdueStatus,
  isSnoozed,
  shouldEscalate,
  shouldNotify,
} from "./status-derivation";

export class ReminderEngine {
  private auditWriter: AuditWriter;
  private subscribedTopics: string[] = [];

  constructor(
    readonly db: NodePgDatabase,
    private readonly pubsub: PubSubUnit,
    private readonly documents: DocumentWorkflow,
    private readonly dashboard: DashboardWorkflow | null = null,
  ) {
    this.auditWriter = new AuditWriter(db);
  }

  async registerSchedules(): Promise<void> {
    await this.pubsub.schedule(
      SCHEDULED_JOBS.DAILY_EXPIRY_SCAN,
      CRON_SCHEDULES.DAILY_EXPIRY_SCAN,
      {},
      { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    );

    await this.pubsub.schedule(
      SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
      CRON_SCHEDULES.DAILY_STATUS_TRANSITION,
      {},
      { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    );

    await this.pubsub.schedule(
      SCHEDULED_JOBS.DAILY_ESCALATION,
      CRON_SCHEDULES.DAILY_ESCALATION,
      {},
      { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    );

    await this.pubsub.schedule(
      SCHEDULED_JOBS.WEEKLY_SUMMARY,
      CRON_SCHEDULES.WEEKLY_SUMMARY,
      {},
      { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    );
  }

  async registerHandlers(): Promise<void> {
    await this.pubsub.subscribe(SCHEDULED_JOBS.DAILY_EXPIRY_SCAN, async () => {
      await this.scanExpiringAndDueDocuments();
    });
    this.subscribedTopics.push(SCHEDULED_JOBS.DAILY_EXPIRY_SCAN);

    await this.pubsub.subscribe(
      SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
      async () => {
        await this.transitionExpiredAndOverdueDocuments();
      },
    );
    this.subscribedTopics.push(SCHEDULED_JOBS.DAILY_STATUS_TRANSITION);

    await this.pubsub.subscribe(SCHEDULED_JOBS.DAILY_ESCALATION, async () => {
      await this.scanEscalations();
    });
    this.subscribedTopics.push(SCHEDULED_JOBS.DAILY_ESCALATION);

    await this.pubsub.subscribe(SCHEDULED_JOBS.WEEKLY_SUMMARY, async () => {
      await this.generateWeeklySummary();
    });
    this.subscribedTopics.push(SCHEDULED_JOBS.WEEKLY_SUMMARY);
  }

  async unregister(): Promise<void> {
    for (const topic of this.subscribedTopics) {
      await this.pubsub.unsubscribe(topic);
    }
    this.subscribedTopics = [];
  }

  async scanExpiringAndDueDocuments(): Promise<number> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let errors = 0;

    try {
      const docs = await this.documents.getActiveDocumentsForReminders();

      for (const doc of docs) {
        if (isSnoozed(doc.snoozedUntil)) continue;

        const reminderDays = (doc.reminderDays as number[] | null) ?? [
          90, 60, 30, 7,
        ];

        if (doc.expiryDate) {
          const daysUntilExpiry = daysUntil(doc.expiryDate);
          if (daysUntilExpiry !== null && daysUntilExpiry > 0) {
            if (
              shouldNotify(reminderDays, doc.lastNotifiedAt, daysUntilExpiry)
            ) {
              await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRING, {
                daysUntilExpiry,
                documentId: doc.id,
                sourceEntityId: doc.sourceEntityId,
                sourceModule: doc.sourceModule,
              });

              await this.documents.updateNotifiedAt(doc.id);

              await this.auditWriter.writeSystem(
                "compliance_document",
                doc.id,
                "reminder_sent",
                { daysUntilExpiry, threshold: "expiry" },
              );

              recordsProcessed++;
            }
          }
        }

        if (doc.dueDate && !doc.completedAt) {
          const daysUntilDue = daysUntil(doc.dueDate);
          if (daysUntilDue !== null && daysUntilDue > 0) {
            if (shouldNotify(reminderDays, doc.lastNotifiedAt, daysUntilDue)) {
              await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_DUE, {
                daysUntilDue,
                documentId: doc.id,
                sourceEntityId: doc.sourceEntityId,
                sourceModule: doc.sourceModule,
              });

              await this.documents.updateNotifiedAt(doc.id);

              await this.auditWriter.writeSystem(
                "compliance_document",
                doc.id,
                "reminder_sent",
                { daysUntilDue, threshold: "due" },
              );

              recordsProcessed++;
            }
          }
        }
      }
    } catch {
      errors++;
    }

    await this.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
      errors,
      executionTime: Date.now() - startTime,
      jobName: SCHEDULED_JOBS.DAILY_EXPIRY_SCAN,
      recordsProcessed,
    });

    return recordsProcessed;
  }

  async transitionExpiredAndOverdueDocuments(): Promise<number> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let errors = 0;

    try {
      const docs = await this.documents.getExpiredAndOverdueDocuments();

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
          await this.documents.updateStatus(
            doc.id,
            newStatus as "expired" | "overdue",
          );

          if (newStatus === "expired") {
            await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_EXPIRED, {
              category: doc.category,
              documentId: doc.id,
              sourceEntityId: doc.sourceEntityId,
              sourceModule: doc.sourceModule,
            });
          } else if (newStatus === "overdue") {
            const daysOverdue = doc.dueDate
              ? Math.abs(daysUntil(doc.dueDate) ?? 0)
              : 0;
            await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_OVERDUE, {
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

    await this.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
      errors,
      executionTime: Date.now() - startTime,
      jobName: SCHEDULED_JOBS.DAILY_STATUS_TRANSITION,
      recordsProcessed,
    });

    return recordsProcessed;
  }

  async scanEscalations(): Promise<number> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let errors = 0;

    try {
      const docs = await this.documents.getEscalatableDocuments();

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
          await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_ESCALATED, {
            daysSinceExpiry: daysSinceTarget,
            documentId: doc.id,
            escalationLevel,
          });

          await this.documents.updateEscalatedAt(doc.id);

          await this.auditWriter.writeSystem(
            "compliance_document",
            doc.id,
            "escalated",
            { daysSinceExpiry: daysSinceTarget, escalationLevel },
          );

          recordsProcessed++;
        }
      }
    } catch {
      errors++;
    }

    await this.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
      errors,
      executionTime: Date.now() - startTime,
      jobName: SCHEDULED_JOBS.DAILY_ESCALATION,
      recordsProcessed,
    });

    return recordsProcessed;
  }

  async generateWeeklySummary(): Promise<void> {
    const startTime = Date.now();

    if (!this.dashboard) {
      await this.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
        errors: 0,
        executionTime: Date.now() - startTime,
        jobName: SCHEDULED_JOBS.WEEKLY_SUMMARY,
        recordsProcessed: 0,
      });
      return;
    }

    const summary = await this.dashboard.getSummary();

    await this.pubsub.publish(COMPLIANCE_EVENTS.WEEKLY_SUMMARY, {
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

    await this.pubsub.publish(COMPLIANCE_EVENTS.SCHEDULED_JOB_EXECUTED, {
      errors: 0,
      executionTime: Date.now() - startTime,
      jobName: SCHEDULED_JOBS.WEEKLY_SUMMARY,
      recordsProcessed: 1,
    });
  }
}
