import { complianceDocument } from "#/db-schemas";
import type { ComplianceObligation } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { SCHEDULED_JOBS } from "#/utils/constants";
import { documents, obligations } from "#/workflows";

import { getContext } from "@aspen-os/platform/server";
import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

function buildDepsFromContext(): ObligationGeneratorDeps {
  const ctx = getContext();
  if (!ctx.audit) {
    throw new Error("Obligation generator requires an active audit context");
  }
  return {
    audit: ctx.audit,
    db: ctx.db as NodePgDatabase,
    pubsub: ctx.pubsub,
  };
}

export async function registerObligationGenerator(): Promise<string> {
  const deps = buildDepsFromContext();
  await deps.pubsub.subscribe(SCHEDULED_JOBS.OBLIGATION_GENERATE, async () => {
    await generatePendingDocuments(deps);
  });
  return SCHEDULED_JOBS.OBLIGATION_GENERATE;
}

export async function unregisterObligationGenerator(topic: string): Promise<void> {
  const { pubsub } = buildDepsFromContext();
  await pubsub.unsubscribe(topic);
}

export async function generatePendingDocuments(deps: ObligationGeneratorDeps): Promise<string[]> {
  const activeObligations = await obligations.getActive.run(
    {},
    { db: deps.db, pubsub: deps.pubsub },
  );
  const generatedIds = (
    await Promise.all(
      activeObligations.map((obligation) => generateForObligation(obligation, undefined, deps)),
    )
  ).flat();

  return generatedIds;
}

export async function generateForObligation(
  obligation: ComplianceObligation,
  upToDate: Date | undefined,
  deps: ObligationGeneratorDeps,
): Promise<string[]> {
  const now = upToDate ?? new Date();
  const endDate = obligation.endDate ? new Date(obligation.endDate) : null;

  if (endDate && endDate < now) {
    return [];
  }

  const periods = computePeriodsUpTo(obligation, now);

  const generatedIds = (
    await Promise.all(
      periods.map(async (period) => {
        const idempotencyKey = buildIdempotencyKey(obligation.id, period);

        const existing = await checkDocumentExists({
          db: deps.db,
          obligationId: obligation.id,
          periodEnd: period.periodEnd,
          periodStart: period.periodStart,
        });

        if (existing) {
          return null;
        }

        const docName = generateDocumentName(obligation, period);
        const reminderDays =
          (obligation.defaultReminderDays as number[] | null) ??
          (obligation.expiryBased ? [90, 60, 30, 7] : [30, 15, 7, 1]);

        const doc = await documents.create.run(
          {
            input: {
              assignedReviewer: obligation.defaultAssignedReviewer ?? undefined,
              assignedTo: obligation.defaultAssignedTo ?? undefined,
              branch: obligation.branch ?? undefined,
              category: obligation.category,
              createdBy: obligation.createdBy,
              documentType: obligation.documentType ?? undefined,
              dueDate: period.dueDate ? new Date(period.dueDate) : undefined,
              escalationDays: obligation.defaultEscalationDays ?? undefined,
              expiryDate: period.expiryDate ? new Date(period.expiryDate) : undefined,
              issuingAuthority: obligation.defaultIssuingAuthority ?? undefined,
              jurisdiction: obligation.defaultJurisdiction ?? undefined,
              metadata: {
                ...(obligation.defaultMetadata as Record<string, unknown>),
                idempotencyKey,
              },
              name: docName,
              obligationId: obligation.id,
              periodEnd: period.periodEnd ? new Date(period.periodEnd) : undefined,
              periodStart: period.periodStart ? new Date(period.periodStart) : undefined,
              reminderDays,
              sourceEntityId: obligation.sourceEntityId ?? undefined,
              sourceEntityType: obligation.sourceEntityType ?? undefined,
              sourceModule: obligation.sourceModule,
            },
          },
          { audit: deps.audit, db: deps.db, pubsub: deps.pubsub },
        );

        await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_GENERATED, {
          documentId: doc.id,
          obligationId: obligation.id,
          sourceModule: obligation.sourceModule,
        });

        return doc.id;
      }),
    )
  ).filter((id): id is string => id !== null);

  return generatedIds;
}

export async function generateDocuments(
  obligationId: string,
  upToDate: Date | undefined,
): Promise<string[]> {
  const deps = buildDepsFromContext();
  const obligation = await obligations.getById.run(
    { id: obligationId },
    { db: deps.db, pubsub: deps.pubsub },
  );
  return generateForObligation(obligation, upToDate, deps);
}

function computePeriodsUpTo(obligation: ComplianceObligation, upTo: Date): ComputedPeriod[] {
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

    if (periodStart > upTo) {
      break;
    }

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
      expiryDate.setMonth(expiryDate.getMonth() + obligation.expiryDurationMonths);
      entry.expiryDate = expiryDate.toISOString().split("T")[0] ?? null;
    } else if (!obligation.expiryBased) {
      const dueDate = new Date(periodEnd);
      const offset = obligation.dueMonthOffset ?? 0;
      dueDate.setMonth(dueDate.getMonth() + offset);
      if (obligation.dueDay) {
        const lastDay = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
        dueDate.setDate(Math.min(obligation.dueDay, lastDay));
      }
      entry.dueDate = dueDate.toISOString().split("T")[0] ?? null;
    }

    periods.push(entry);
  }

  return periods;
}

function generateDocumentName(obligation: ComplianceObligation, period: ComputedPeriod): string {
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

function buildIdempotencyKey(obligationId: string, period: ComputedPeriod): string {
  return `${obligationId}:${period.periodStart ?? "null"}:${period.periodEnd ?? "null"}`;
}

async function checkDocumentExists(options: {
  db: NodePgDatabase;
  obligationId: string;
  periodEnd: string | null;
  periodStart: string | null;
}): Promise<boolean> {
  const conditions = [eq(complianceDocument.obligationId, options.obligationId)];

  if (options.periodStart) {
    conditions.push(eq(complianceDocument.periodStart, options.periodStart));
  } else {
    conditions.push(isNull(complianceDocument.periodStart));
  }

  if (options.periodEnd) {
    conditions.push(eq(complianceDocument.periodEnd, options.periodEnd));
  }

  const existing = await options.db
    .select({ id: complianceDocument.id })
    .from(complianceDocument)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0;
}
