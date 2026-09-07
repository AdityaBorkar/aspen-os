import { complianceDocument, complianceObligation } from "#/db-schemas";
import { DashboardSummarySchema } from "#/schemas/dashboard";
import type { DashboardSummary } from "#/types";
import { VERIFICATION_STATUS } from "#/utils/constants";
import { futureDateOnly, todayDateOnly } from "#/utils/dates";
import { dashboardSummaryKey } from "#/workflows/dashboard/cache/keys";
import { computeHealthScore, getCacheTtl, getKvStore } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { safeParse } from "valibot";

const getDashboardSummary = Workflow.name("dashboard.summary").handler(
  async (input: { branchFilter?: string }, ctx): Promise<DashboardSummary> => {
    const { branchFilter } = input;
    const kvStore = getKvStore(ctx.config);
    const cacheTtl = getCacheTtl(ctx.config, 300);

    const cacheKey = dashboardSummaryKey(branchFilter);

    const cached = kvStore ? await kvStore.get(cacheKey) : null;
    const cachedSummary = safeParse(DashboardSummarySchema, cached);
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
          expired: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = ${VERIFICATION_STATUS.EXPIRED})::int`,
          overdue: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = ${VERIFICATION_STATUS.OVERDUE})::int`,
          pendingReview: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} in (${VERIFICATION_STATUS.SUBMITTED}, ${VERIFICATION_STATUS.UNDER_REVIEW}))::int`,
          rejected: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = ${VERIFICATION_STATUS.REJECTED})::int`,
          total: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} != ${VERIFICATION_STATUS.ARCHIVED})::int`,
          verified: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = ${VERIFICATION_STATUS.VERIFIED})::int`,
        })
        .from(complianceDocument)
        .where(whereClause),
      db
        .select({
          dueSoon: sql<number>`count(*) filter (where ${complianceDocument.dueDate} is not null and ${complianceDocument.dueDate} <= ${futureStr} and ${complianceDocument.dueDate} >= ${nowStr} and ${complianceDocument.completedAt} is null)::int`,
          expiringSoon: sql<number>`count(*) filter (where ${complianceDocument.expiryDate} is not null and ${complianceDocument.expiryDate} <= ${futureStr} and ${complianceDocument.expiryDate} >= ${nowStr})::int`,
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
          sourceModule: complianceDocument.sourceModule,
        })
        .from(complianceDocument)
        .where(whereClause)
        .groupBy(complianceDocument.sourceModule),
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
          status: complianceDocument.verificationStatus,
        })
        .from(complianceDocument)
        .where(whereClause)
        .groupBy(complianceDocument.verificationStatus),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(complianceObligation)
        .where(eq(complianceObligation.isActive, true)),
      (() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const generatedConditions = [
          isNotNull(complianceDocument.obligationId),
          gte(complianceDocument.createdAt, thirtyDaysAgo),
        ];
        if (branchFilter) {
          generatedConditions.push(eq(complianceDocument.branch, branchFilter));
        }
        return db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(complianceDocument)
          .where(and(...generatedConditions));
      })(),
    ]);

    const [counts] = countsRows;
    const [dateCounts] = dateCountsRows;
    const [obligationCount] = obligationCountRows;
    const [generatedCount] = generatedCountRows;

    const byCategory: DashboardSummary["byCategory"] = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    const bySourceModule: DashboardSummary["bySourceModule"] = {};
    for (const row of sourceRows) {
      bySourceModule[row.sourceModule] = row.count;
    }

    const byBranch: DashboardSummary["byBranch"] = {};
    for (const row of branchRows) {
      if (row.branch) {
        byBranch[row.branch] = row.count;
      }
    }

    const byStatus: DashboardSummary["byStatus"] = {};
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
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
    const summary: DashboardSummary = {
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
      // JSON round-trip intentionally erases the nominal DashboardSummary type to plain JSON for kvStore.
      // oxlint-disable unicorn/prefer-structured-clone
      await kvStore.set(cacheKey, JSON.parse(JSON.stringify(summary)), cacheTtl);
    }

    return summary;
  },
);

export { getDashboardSummary };
