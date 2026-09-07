import { complianceDocument } from "#/db-schemas";
import type { ComplianceObligation } from "#/db-schemas";
import { COMPLIANCE_EVENTS } from "#/pubsub";
import { MAX_PERIODS_PER_RUN, SCHEDULED_JOBS, reminderDefaults } from "#/utils/constants";
import { formatMonthLabel, toDateOnly, utcMonthEnd, utcMonthStart } from "#/utils/dates";
import { documents, obligations } from "#/workflows";
import { monthsPerFrequency } from "#/workflows/utils";

import { getContext } from "@aspen-os/platform/server";
import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

interface ComputedPeriod {
  dueDate: string | null;
  expiryDate: string | null;
  periodEnd: string | null;
  periodStart: string | null;
}

export interface ObligationGeneratorDeps {
  audit: AuditUnit;
  db: PostgresJsDatabase;
  pubsub: PubSubUnit;
}

function buildDepsFromContext(): ObligationGeneratorDeps {
  const ctx = getContext();
  if (!ctx.audit) {
    throw new Error("Obligation generator requires an active audit context");
  }
  return {
    audit: ctx.audit,
    db: ctx.db,
    pubsub: ctx.pubsub,
  };
}

function valueOrUndefined<Value>(value: Value | null | undefined): Value | undefined {
  return value ?? undefined;
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
  const generatedIds: string[] = [];
  // Sequential generation: parallel check-then-insert races duplicate detection.
  // oxlint-disable eslint/no-await-in-loop
  for (const obligation of activeObligations) {
    const ids = await generateForObligation(obligation, undefined, deps);
    generatedIds.push(...ids);
  }
  // oxlint-enable eslint/no-await-in-loop

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
  const generatedIds: string[] = [];

  // Sequential check-then-insert so existence checks observe prior inserts.
  // oxlint-disable eslint/no-await-in-loop
  for (const period of periods) {
    if (period.dueDate === null && period.expiryDate === null) {
      continue;
    }
    const idempotencyKey = buildIdempotencyKey(obligation.id, period);

    const existing = await checkDocumentExists({
      db: deps.db,
      dueDate: period.dueDate,
      expiryDate: period.expiryDate,
      obligationId: obligation.id,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
    });

    if (existing) {
      continue;
    }

    const docName = generateDocumentName(obligation, period);
    const reminderDays = obligation.defaultReminderDays ?? reminderDefaults(obligation.expiryBased);

    const metadata = {
      ...obligation.defaultMetadata,
      idempotencyKey,
    };

    const doc = await documents.create.run(
      {
        input: {
          assignedReviewer: valueOrUndefined(obligation.defaultAssignedReviewer),
          assignedTo: valueOrUndefined(obligation.defaultAssignedTo),
          branch: valueOrUndefined(obligation.branch),
          category: obligation.category,
          createdBy: obligation.createdBy,
          documentType: valueOrUndefined(obligation.documentType),
          dueDate: period.dueDate ? new Date(period.dueDate) : undefined,
          escalationDays: valueOrUndefined(obligation.defaultEscalationDays),
          expiryDate: period.expiryDate ? new Date(period.expiryDate) : undefined,
          issuingAuthority: valueOrUndefined(obligation.defaultIssuingAuthority),
          jurisdiction: valueOrUndefined(obligation.defaultJurisdiction),
          metadata,
          name: docName,
          obligationId: obligation.id,
          periodEnd: period.periodEnd ? new Date(period.periodEnd) : undefined,
          periodStart: period.periodStart ? new Date(period.periodStart) : undefined,
          reminderDays,
          sourceEntityId: valueOrUndefined(obligation.sourceEntityId),
          sourceEntityType: valueOrUndefined(obligation.sourceEntityType),
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

    generatedIds.push(doc.id);
  }
  // oxlint-enable eslint/no-await-in-loop

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

  const monthsPerPeriod = monthsPerFrequency(obligation.frequency);
  if (monthsPerPeriod === null) {
    throw new Error(`Unsupported obligation frequency "${obligation.frequency}"`);
  }

  const periods: ComputedPeriod[] = [];
  const startDate = new Date(obligation.startDate);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endDate = obligation.endDate ? new Date(obligation.endDate) : null;
  const horizon = endDate && endDate < upTo ? endDate : upTo;

  let index = 0;
  while (periods.length < MAX_PERIODS_PER_RUN) {
    const periodStart = utcMonthStart(startYear, startMonth + index * monthsPerPeriod);

    if (periodStart > horizon) {
      break;
    }

    const periodEnd = utcMonthEnd(startYear, startMonth + index * monthsPerPeriod);

    const entry: ComputedPeriod = {
      dueDate: null,
      expiryDate: null,
      periodEnd: null,
      periodStart: null,
    };

    if (obligation.periodBased) {
      entry.periodStart = toDateOnly(periodStart);
      entry.periodEnd = toDateOnly(periodEnd);
    }

    if (obligation.expiryBased && obligation.expiryDurationMonths) {
      const expiryDate = new Date(periodStart);
      expiryDate.setUTCMonth(expiryDate.getUTCMonth() + obligation.expiryDurationMonths);
      entry.expiryDate = toDateOnly(expiryDate);
    } else if (!obligation.expiryBased) {
      const dueDate = new Date(periodEnd);
      const offset = obligation.dueMonthOffset ?? 0;
      dueDate.setUTCMonth(dueDate.getUTCMonth() + offset);
      if (obligation.dueDay) {
        const lastDay = new Date(
          Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, 0),
        ).getUTCDate();
        dueDate.setUTCDate(Math.min(obligation.dueDay, lastDay));
      }
      entry.dueDate = toDateOnly(dueDate);
    }

    periods.push(entry);
    index++;
  }

  return periods;
}

function generateDocumentName(obligation: ComplianceObligation, period: ComputedPeriod): string {
  if (period.periodStart && period.periodEnd) {
    const startLabel = formatMonthLabel(new Date(period.periodStart));
    const endLabel = formatMonthLabel(new Date(period.periodEnd));
    if (startLabel === endLabel) {
      return `${obligation.name} — ${startLabel}`;
    }
    return `${obligation.name} — ${startLabel} to ${endLabel}`;
  }
  if (period.expiryDate) {
    const label = formatMonthLabel(new Date(period.expiryDate));
    return `${obligation.name} — ${label}`;
  }
  return obligation.name;
}

function buildIdempotencyKey(obligationId: string, period: ComputedPeriod): string {
  return [
    obligationId,
    period.periodStart ?? "null",
    period.periodEnd ?? "null",
    period.dueDate ?? "null",
    period.expiryDate ?? "null",
  ].join(":");
}

async function checkDocumentExists(options: {
  db: PostgresJsDatabase;
  dueDate: string | null;
  expiryDate: string | null;
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
  } else {
    conditions.push(isNull(complianceDocument.periodEnd));
  }

  if (options.dueDate) {
    conditions.push(eq(complianceDocument.dueDate, options.dueDate));
  } else {
    conditions.push(isNull(complianceDocument.dueDate));
  }

  if (options.expiryDate) {
    conditions.push(eq(complianceDocument.expiryDate, options.expiryDate));
  } else {
    conditions.push(isNull(complianceDocument.expiryDate));
  }

  const existing = await options.db
    .select({ id: complianceDocument.id })
    .from(complianceDocument)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0;
}
