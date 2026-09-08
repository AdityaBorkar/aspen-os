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
  const endDate = obligation.end_date ? new Date(obligation.end_date) : null;

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
    const reminderDays =
      obligation.default_reminder_days ?? reminderDefaults(obligation.expiry_based);

    const metadata = {
      ...obligation.default_metadata,
      idempotencyKey,
    };

    const doc = await documents.create.run(
      {
        input: {
          assignedReviewer: obligation.default_assigned_reviewer ?? undefined,
          assignedTo: obligation.default_assigned_to ?? undefined,
          branch: obligation.branch ?? undefined,
          category: obligation.category,
          createdBy: obligation.created_by,
          documentType: obligation.document_type ?? undefined,
          dueDate: period.dueDate ? new Date(period.dueDate) : undefined,
          escalationDays: obligation.default_escalation_days ?? undefined,
          expiryDate: period.expiryDate ? new Date(period.expiryDate) : undefined,
          issuingAuthority: obligation.default_issuing_authority ?? undefined,
          jurisdiction: obligation.default_jurisdiction ?? undefined,
          metadata,
          name: docName,
          obligationId: obligation.id,
          periodEnd: period.periodEnd ? new Date(period.periodEnd) : undefined,
          periodStart: period.periodStart ? new Date(period.periodStart) : undefined,
          reminderDays,
          sourceEntityId: obligation.source_entity_id ?? undefined,
          sourceEntityType: obligation.source_entity_type ?? undefined,
          sourceModule: obligation.source_module,
        },
      },
      { audit: deps.audit, db: deps.db, pubsub: deps.pubsub },
    );

    await deps.pubsub.publish(COMPLIANCE_EVENTS.DOCUMENT_GENERATED, {
      documentId: doc.id,
      obligationId: obligation.id,
      sourceModule: obligation.source_module,
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
  const startDate = new Date(obligation.start_date);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endDate = obligation.end_date ? new Date(obligation.end_date) : null;
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

    if (obligation.period_based) {
      entry.periodStart = toDateOnly(periodStart);
      entry.periodEnd = toDateOnly(periodEnd);
    }

    if (obligation.expiry_based && obligation.expiry_duration_months) {
      const expiryDate = new Date(periodStart);
      expiryDate.setUTCMonth(expiryDate.getUTCMonth() + obligation.expiry_duration_months);
      entry.expiryDate = toDateOnly(expiryDate);
    } else if (!obligation.expiry_based) {
      const dueDate = new Date(periodEnd);
      const offset = obligation.due_month_offset ?? 0;
      dueDate.setUTCMonth(dueDate.getUTCMonth() + offset);
      if (obligation.due_day) {
        const lastDay = new Date(
          Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, 0),
        ).getUTCDate();
        dueDate.setUTCDate(Math.min(obligation.due_day, lastDay));
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
  const conditions = [
    eq(complianceDocument.obligation_id, options.obligationId),
    options.periodStart
      ? eq(complianceDocument.period_start, options.periodStart)
      : isNull(complianceDocument.period_start),
    options.periodEnd
      ? eq(complianceDocument.period_end, options.periodEnd)
      : isNull(complianceDocument.period_end),
    options.dueDate
      ? eq(complianceDocument.due_date, options.dueDate)
      : isNull(complianceDocument.due_date),
    options.expiryDate
      ? eq(complianceDocument.expiry_date, options.expiryDate)
      : isNull(complianceDocument.expiry_date),
  ];

  const existing = await options.db
    .select({ id: complianceDocument.id })
    .from(complianceDocument)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0;
}
