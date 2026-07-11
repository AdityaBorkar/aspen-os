import type { PubSubUnit } from "@aspen-os/framework/server";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { SCHEDULED_JOBS } from "../constants";
import type { ComplianceObligation } from "../db-schema";
import { complianceDocument } from "../db-schema";
import { COMPLIANCE_EVENTS } from "../event-map";
import type { DocumentWorkflow } from "../workflows/document";
import type { ObligationWorkflow } from "../workflows/obligation";
import { AuditWriter } from "./audit-writer";

const MONTHS_PER_FREQUENCY: Record<string, number> = {
  annual: 12,
  biennial: 24,
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  triennial: 36,
};

interface ComputedPeriod {
  dueDate: string | null;
  expiryDate: string | null;
  periodEnd: string | null;
  periodStart: string | null;
}

export class ObligationGenerator {
  private auditWriter: AuditWriter;
  private subscribed: boolean = false;

  constructor(
    private readonly db: NodePgDatabase,
    private readonly pubsub: PubSubUnit,
    readonly _documents: DocumentWorkflow,
    private readonly obligations: ObligationWorkflow,
  ) {
    this.auditWriter = new AuditWriter(db);
  }

  async registerHandler(): Promise<void> {
    await this.pubsub.subscribe(
      SCHEDULED_JOBS.OBLIGATION_GENERATE,
      async () => {
        await this.generatePendingDocuments();
      },
    );
    this.subscribed = true;
  }

  async unregister(): Promise<void> {
    if (this.subscribed) {
      await this.pubsub.unsubscribe(SCHEDULED_JOBS.OBLIGATION_GENERATE);
      this.subscribed = false;
    }
  }

  async generatePendingDocuments(): Promise<string[]> {
    const activeObligations = await this.obligations.getActiveObligations();
    const generatedIds: string[] = [];

    for (const obligation of activeObligations) {
      const ids = await this.generateForObligation(obligation);
      generatedIds.push(...ids);
    }

    return generatedIds;
  }

  async generateForObligation(
    obligation: ComplianceObligation,
    upToDate?: Date,
  ): Promise<string[]> {
    const generatedIds: string[] = [];
    const now = upToDate ?? new Date();
    const endDate = obligation.endDate ? new Date(obligation.endDate) : null;

    if (endDate && endDate < now) return generatedIds;

    const periods = this.computePeriodsUpTo(obligation, now);

    for (const period of periods) {
      const idempotencyKey = this.buildIdempotencyKey(obligation.id, period);

      const existing = await this.checkDocumentExists(
        obligation.id,
        period.periodStart,
        period.periodEnd,
      );

      if (existing) continue;

      const docName = this.generateDocumentName(obligation, period);
      const reminderDays =
        (obligation.defaultReminderDays as number[] | null) ??
        (obligation.expiryBased ? [90, 60, 30, 7] : [30, 15, 7, 1]);

      const [doc] = await this.db
        .insert(complianceDocument)
        .values({
          assignedReviewer: obligation.defaultAssignedReviewer,
          assignedTo: obligation.defaultAssignedTo,
          branch: obligation.branch,
          category: obligation.category,
          createdBy: obligation.createdBy,
          documentType: obligation.documentType,
          dueDate: period.dueDate,
          escalationDays: obligation.defaultEscalationDays,
          expiryDate: period.expiryDate,
          issuingAuthority: obligation.defaultIssuingAuthority,
          jurisdiction: obligation.defaultJurisdiction,
          metadata: {
            ...(obligation.defaultMetadata as Record<string, unknown>),
            idempotencyKey,
          },
          name: docName,
          obligationId: obligation.id,
          periodEnd: period.periodEnd,
          periodStart: period.periodStart,
          reminderDays,
          sourceEntityId: obligation.sourceEntityId,
          sourceEntityType: obligation.sourceEntityType,
          sourceModule: obligation.sourceModule,
          verificationStatus: "draft",
        })
        .returning();

      if (!doc) continue;

      generatedIds.push(doc.id);

      await this.auditWriter.writeSystem(
        "compliance_document",
        doc.id,
        "document_generated",
        { obligationId: obligation.id, period },
      );

      await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_GENERATED, {
        documentId: doc.id,
        obligationId: obligation.id,
        sourceModule: obligation.sourceModule,
      });

      await this.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
        document: {
          category: doc.category,
          id: doc.id,
          name: doc.name,
        },
      });
    }

    return generatedIds;
  }

  async generateDocuments(
    obligationId: string,
    upToDate?: Date,
  ): Promise<string[]> {
    const obligation = await this.obligations.getById(obligationId);
    return this.generateForObligation(obligation, upToDate);
  }

  private computePeriodsUpTo(
    obligation: ComplianceObligation,
    upTo: Date,
  ): ComputedPeriod[] {
    if (obligation.frequency === "custom") {
      return [];
    }

    const periods: ComputedPeriod[] = [];
    const startDate = new Date(obligation.startDate);
    const monthsPerPeriod = MONTHS_PER_FREQUENCY[obligation.frequency] ?? 1;

    let index = 0;
    while (true) {
      const periodStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + index * monthsPerPeriod,
        1,
      );

      if (periodStart > upTo) break;

      const periodEnd = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + (index + 1) * monthsPerPeriod,
        0,
      );

      const entry: ComputedPeriod = {
        dueDate: null,
        expiryDate: null,
        periodEnd: null,
        periodStart: null,
      };

      if (obligation.periodBased) {
        entry.periodStart = periodStart.toISOString().split("T")[0] ?? null;
        entry.periodEnd = periodEnd.toISOString().split("T")[0] ?? null;
      }

      if (obligation.expiryBased && obligation.expiryDurationMonths) {
        const expiryDate = new Date(periodStart);
        expiryDate.setMonth(
          expiryDate.getMonth() + obligation.expiryDurationMonths,
        );
        entry.expiryDate = expiryDate.toISOString().split("T")[0] ?? null;
      } else if (!obligation.expiryBased) {
        const dueDate = new Date(periodEnd);
        const offset = obligation.dueMonthOffset ?? 0;
        dueDate.setMonth(dueDate.getMonth() + offset);
        if (obligation.dueDay) {
          const lastDay = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth() + 1,
            0,
          ).getDate();
          dueDate.setDate(Math.min(obligation.dueDay, lastDay));
        }
        entry.dueDate = dueDate.toISOString().split("T")[0] ?? null;
      }

      periods.push(entry);
      index++;
    }

    return periods;
  }

  private generateDocumentName(
    obligation: ComplianceObligation,
    period: ComputedPeriod,
  ): string {
    if (period.periodStart && period.periodEnd) {
      const start = new Date(period.periodStart);
      const end = new Date(period.periodEnd);
      const startLabel = start.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const endLabel = end.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (startLabel === endLabel) {
        return `${obligation.name} — ${startLabel}`;
      }
      return `${obligation.name} — ${startLabel} to ${endLabel}`;
    }
    if (period.expiryDate) {
      const expiry = new Date(period.expiryDate);
      const label = expiry.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      return `${obligation.name} — ${label}`;
    }
    return obligation.name;
  }

  private buildIdempotencyKey(
    obligationId: string,
    period: ComputedPeriod,
  ): string {
    return `${obligationId}:${period.periodStart ?? "null"}:${period.periodEnd ?? "null"}`;
  }

  private async checkDocumentExists(
    obligationId: string,
    periodStart: string | null,
    periodEnd: string | null,
  ): Promise<boolean> {
    const conditions = [eq(complianceDocument.obligationId, obligationId)];

    if (periodStart) {
      conditions.push(eq(complianceDocument.periodStart, periodStart));
    } else {
      conditions.push(isNull(complianceDocument.periodStart));
    }

    if (periodEnd) {
      conditions.push(eq(complianceDocument.periodEnd, periodEnd));
    }

    const existing = await this.db
      .select({ id: complianceDocument.id })
      .from(complianceDocument)
      .where(and(...conditions))
      .limit(1);

    return existing.length > 0;
  }
}
