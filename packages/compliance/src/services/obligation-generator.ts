import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { SCHEDULED_JOBS } from "../constants";
import type { ComplianceObligation } from "../db-schema";
import { complianceDocument } from "../db-schema";
import { COMPLIANCE_EVENTS } from "../pubsub-events";
import {
  getActiveObligations,
  getObligationById,
  type ObligationDeps,
} from "../workflows/obligation";
import { writeSystemAudit } from "./audit-writer";

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

export interface ObligationGeneratorDeps {
  db: NodePgDatabase;
  obligationDeps: ObligationDeps;
  pubsub: PubSubUnit;
}

export async function registerObligationGenerator({
  pubsub,
  db,
  obligationDeps,
}: ObligationGeneratorDeps): Promise<string> {
  await pubsub.subscribe(SCHEDULED_JOBS.OBLIGATION_GENERATE, async () => {
    await generatePendingDocuments({ db, obligationDeps, pubsub });
  });
  return SCHEDULED_JOBS.OBLIGATION_GENERATE;
}

export async function unregisterObligationGenerator(
  topic: string,
  { pubsub }: Pick<ObligationGeneratorDeps, "pubsub">,
): Promise<void> {
  await pubsub.unsubscribe(topic);
}

export async function generatePendingDocuments(
  deps: ObligationGeneratorDeps,
): Promise<string[]> {
  const activeObligations = await getActiveObligations(deps.obligationDeps);
  const generatedIds: string[] = [];

  for (const obligation of activeObligations) {
    const ids = await generateForObligation(obligation, undefined, deps);
    generatedIds.push(...ids);
  }

  return generatedIds;
}

export async function generateForObligation(
  obligation: ComplianceObligation,
  upToDate: Date | undefined,
  deps: ObligationGeneratorDeps,
): Promise<string[]> {
  const generatedIds: string[] = [];
  const now = upToDate ?? new Date();
  const endDate = obligation.endDate ? new Date(obligation.endDate) : null;

  if (endDate && endDate < now) return generatedIds;

  const periods = computePeriodsUpTo(obligation, now);

  for (const period of periods) {
    const idempotencyKey = buildIdempotencyKey(obligation.id, period);

    const existing = await checkDocumentExists(
      obligation.id,
      period.periodStart,
      period.periodEnd,
      deps.db,
    );

    if (existing) continue;

    const docName = generateDocumentName(obligation, period);
    const reminderDays =
      (obligation.defaultReminderDays as number[] | null) ??
      (obligation.expiryBased ? [90, 60, 30, 7] : [30, 15, 7, 1]);

    const [doc] = await deps.db
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

    await writeSystemAudit(
      {
        action: "document_generated",
        entityId: doc.id,
        entityType: "compliance_document",
        metadata: { obligationId: obligation.id, period },
      },
      { db: deps.db },
    );

    await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_GENERATED, {
      documentId: doc.id,
      obligationId: obligation.id,
      sourceModule: obligation.sourceModule,
    });

    await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_CREATED, {
      document: {
        category: doc.category,
        id: doc.id,
        name: doc.name,
      },
    });
  }

  return generatedIds;
}

export async function generateDocuments(
  obligationId: string,
  upToDate: Date | undefined,
  deps: ObligationGeneratorDeps,
): Promise<string[]> {
  const obligation = await getObligationById(obligationId, deps.obligationDeps);
  return generateForObligation(obligation, upToDate, deps);
}

function computePeriodsUpTo(
  obligation: ComplianceObligation,
  upTo: Date,
): ComputedPeriod[] {
  if (obligation.frequency === "custom") {
    return [];
  }

  const periods: ComputedPeriod[] = [];
  const startDate = new Date(obligation.startDate);
  const monthsPerPeriod = MONTHS_PER_FREQUENCY[obligation.frequency] ?? 1;

  for (let index = 0; ; index++) {
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
  }

  return periods;
}

function generateDocumentName(
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

function buildIdempotencyKey(
  obligationId: string,
  period: ComputedPeriod,
): string {
  return `${obligationId}:${period.periodStart ?? "null"}:${period.periodEnd ?? "null"}`;
}

async function checkDocumentExists(
  obligationId: string,
  periodStart: string | null,
  periodEnd: string | null,
  db: NodePgDatabase,
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

  const existing = await db
    .select({ id: complianceDocument.id })
    .from(complianceDocument)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0;
}
