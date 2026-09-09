import { complianceDocument, complianceObligation } from "#/db-schemas";
import type { ComplianceDocument } from "#/db-schemas";
import { SummarySchema } from "#/schemas/summary";
import type { Summary } from "#/types";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { futureDateOnly, todayDateOnly } from "#/utils/dates";
import { summaryKey } from "#/workflows/summary/cache/keys";
import { computeHealthScore, getCacheTtl, getKvStore } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { safeParse } from "valibot";

const getSummary = Workflow.name("summary.get").handler(
  async (input: { branchFilter?: string }, ctx): Promise<Summary> => {
    const { branchFilter } = input;
    const kvStore = getKvStore(ctx.config);
    const cacheTtl = getCacheTtl(ctx.config, 300);

    const cacheKey = summaryKey(branchFilter);

    const cached = kvStore ? await kvStore.get(cacheKey) : null;
    const cachedSummary = safeParse(SummarySchema, cached);
    if (cachedSummary.success) {
      return cachedSummary.output;
    }

    const { db } = ctx;

    const conditions = [];
    if (branchFilter) {
      conditions.push(eq(complianceDocument.branch, branchFilter));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const nowStr = todayDateOnly();
    const futureStr = futureDateOnly(30);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const generatedConditions = [
      isNotNull(complianceDocument.obligation_id),
      gte(complianceDocument.created_at, thirtyDaysAgo),
    ];
    if (branchFilter) {
      generatedConditions.push(eq(complianceDocument.branch, branchFilter));
    }

    const [
      countsRows,
      dateCountsRows,
      categoryRows,
      sourceRows,
      branchRows,
      statusRows,
      obligationCountRows,
      generatedCountRows,
    ] = await Promise.all([
      db
        .select({
          expired: sql<number>`count(*) filter (where ${complianceDocument.verification_status} = ${VERIFICATION_STATUS.EXPIRED})::int`,
          overdue: sql<number>`count(*) filter (where ${complianceDocument.verification_status} = ${VERIFICATION_STATUS.OVERDUE})::int`,
          pendingReview: sql<number>`count(*) filter (where ${complianceDocument.verification_status} in (${VERIFICATION_STATUS.SUBMITTED}, ${VERIFICATION_STATUS.UNDER_REVIEW}))::int`,
          rejected: sql<number>`count(*) filter (where ${complianceDocument.verification_status} = ${VERIFICATION_STATUS.REJECTED})::int`,
          total: sql<number>`count(*) filter (where ${complianceDocument.verification_status} != ${VERIFICATION_STATUS.ARCHIVED})::int`,
          verified: sql<number>`count(*) filter (where ${complianceDocument.verification_status} = ${VERIFICATION_STATUS.VERIFIED})::int`,
        })
        .from(complianceDocument)
        .where(whereClause),
      db
        .select({
          dueSoon: sql<number>`count(*) filter (where ${complianceDocument.due_date} is not null and ${complianceDocument.due_date} <= ${futureStr} and ${complianceDocument.due_date} >= ${nowStr} and ${complianceDocument.completed_at} is null)::int`,
          expiringSoon: sql<number>`count(*) filter (where ${complianceDocument.expiry_date} is not null and ${complianceDocument.expiry_date} <= ${futureStr} and ${complianceDocument.expiry_date} >= ${nowStr})::int`,
        })
        .from(complianceDocument)
        .where(whereClause),
      db
        .select({
          category: complianceDocument.category,
          count: sql<number>`count(*)::int`,
        })
        .from(complianceDocument)
        .where(whereClause)
        .groupBy(complianceDocument.category),
      db
        .select({
          count: sql<number>`count(*)::int`,
          sourceModule: complianceDocument.source_module,
        })
        .from(complianceDocument)
        .where(whereClause)
        .groupBy(complianceDocument.source_module),
      db
        .select({
          branch: complianceDocument.branch,
          count: sql<number>`count(*)::int`,
        })
        .from(complianceDocument)
        .where(whereClause)
        .groupBy(complianceDocument.branch),
      db
        .select({
          count: sql<number>`count(*)::int`,
          status: complianceDocument.verification_status,
        })
        .from(complianceDocument)
        .where(whereClause)
        .groupBy(complianceDocument.verification_status),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(complianceObligation)
        .where(eq(complianceObligation.is_active, true)),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(complianceDocument)
        .where(and(...generatedConditions)),
    ]);

    const [counts] = countsRows;
    const [dateCounts] = dateCountsRows;
    const [obligationCount] = obligationCountRows;
    const [generatedCount] = generatedCountRows;

    const byCategory: Summary["byCategory"] = toCountMap(
      categoryRows,
      (row: { category: ComplianceDocument["category"]; count: number }) => row.category,
    );
    const bySourceModule: Summary["bySourceModule"] = toCountMap(
      sourceRows,
      (row: { count: number; sourceModule: ComplianceDocument["source_module"] }) =>
        row.sourceModule,
    );
    const byStatus: Summary["byStatus"] = toCountMap(
      statusRows,
      (row: { count: number; status: ComplianceDocument["verification_status"] }) => row.status,
    );

    const byBranch: Summary["byBranch"] = {};
    for (const row of branchRows) {
      if (row.branch) {
        byBranch[row.branch] = row.count;
      }
    }

    const total = counts?.total ?? 0;
    const verified = counts?.verified ?? 0;
    const expired = counts?.expired ?? 0;
    const overdue = counts?.overdue ?? 0;
    const rejected = counts?.rejected ?? 0;

    const healthScore = computeHealthScore({
      expired,
      overdue,
      rejected,
      total,
      verified,
    });

    // Note: `total` excludes archived documents while `byStatus` includes
    // every status, so total !== sum(byStatus) by design.
    const summary: Summary = {
      activeObligations: obligationCount?.count ?? 0,
      byBranch,
      byCategory,
      bySourceModule,
      byStatus,
      documentsGenerated30d: generatedCount?.count ?? 0,
      dueSoon: dateCounts?.dueSoon ?? 0,
      expired,
      expiringSoon: dateCounts?.expiringSoon ?? 0,
      healthScore,
      overdue,
      pendingReview: counts?.pendingReview ?? 0,
      rejected,
      total,
      verified,
    };

    if (kvStore) {
      // JSON round-trip intentionally erases the nominal Summary type to plain JSON for kvStore.
      // oxlint-disable unicorn/prefer-structured-clone
      await kvStore.set(cacheKey, JSON.parse(JSON.stringify(summary)), cacheTtl);
    }

    return summary;
  },
);

function toCountMap<Row extends { count: number }>(
  rows: Row[],
  pickKey: (row: Row) => PropertyKey,
) {
  return Object.fromEntries(
    rows.map((row): readonly [PropertyKey, number] => [pickKey(row), row.count]),
  );
}

export { getSummary };
/** @deprecated Use getSummary — harmonized Dashboard → Summary (keep getSummary verb) */
export const getDashboardSummary = getSummary;
