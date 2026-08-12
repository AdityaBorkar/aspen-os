import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";

import { complianceDocument, complianceObligation } from "../db-schemas";
import type { DashboardSummary } from "../types";
import { computeHealthScore } from "./utils";

const CACHE_KEY = "compliance:dashboard:summary";

const getDashboardSummary = Workflow.name("dashboard.summary").handler(
  async (input: { branchFilter?: string }, ctx): Promise<DashboardSummary> => {
    const branchFilter = input.branchFilter;
    const kvStore = ctx.config.kvStore as
      | {
          get<T>(key: string): Promise<T | null>;
          set<T>(key: string, value: T, ttl?: number): Promise<void>;
          del(key: string): Promise<void>;
        }
      | undefined;
    const cacheTtl = (ctx.config.cacheTtl as number | undefined) ?? 300;

    const cacheKey = branchFilter ? `${CACHE_KEY}:${branchFilter}` : CACHE_KEY;

    const cached = kvStore
      ? await kvStore.get<DashboardSummary>(cacheKey)
      : null;
    if (cached) return cached;

    const db = ctx.db;

    const conditions = [];
    if (branchFilter) {
      conditions.push(eq(complianceDocument.branch, branchFilter));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [counts] = await db
      .select({
        expired: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = 'expired')::int`,
        overdue: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = 'overdue')::int`,
        pendingReview: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} in ('submitted', 'under_review'))::int`,
        rejected: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = 'rejected')::int`,
        total: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} != 'archived')::int`,
        verified: sql<number>`count(*) filter (where ${complianceDocument.verificationStatus} = 'verified')::int`,
      })
      .from(complianceDocument)
      .where(whereClause);

    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const nowStr = now.toISOString().split("T")[0] as string;
    const futureStr = thirtyDaysLater.toISOString().split("T")[0] as string;

    const [dateCounts] = await db
      .select({
        dueSoon: sql<number>`count(*) filter (where ${complianceDocument.dueDate} is not null and ${complianceDocument.dueDate} <= '${sql.raw(futureStr)}' and ${complianceDocument.dueDate} >= '${sql.raw(nowStr)}' and ${complianceDocument.completedAt} is null)::int`,
        expiringSoon: sql<number>`count(*) filter (where ${complianceDocument.expiryDate} is not null and ${complianceDocument.expiryDate} <= '${sql.raw(futureStr)}' and ${complianceDocument.expiryDate} >= '${sql.raw(nowStr)}')::int`,
      })
      .from(complianceDocument)
      .where(whereClause);

    const categoryRows = await db
      .select({
        category: complianceDocument.category,
        count: sql<number>`count(*)::int`,
      })
      .from(complianceDocument)
      .where(whereClause)
      .groupBy(complianceDocument.category);

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    const sourceRows = await db
      .select({
        count: sql<number>`count(*)::int`,
        sourceModule: complianceDocument.sourceModule,
      })
      .from(complianceDocument)
      .where(whereClause)
      .groupBy(complianceDocument.sourceModule);

    const bySourceModule: Record<string, number> = {};
    for (const row of sourceRows) {
      bySourceModule[row.sourceModule] = row.count;
    }

    const branchRows = await db
      .select({
        branch: complianceDocument.branch,
        count: sql<number>`count(*)::int`,
      })
      .from(complianceDocument)
      .where(whereClause)
      .groupBy(complianceDocument.branch);

    const byBranch: Record<string, number> = {};
    for (const row of branchRows) {
      if (row.branch) {
        byBranch[row.branch] = row.count;
      }
    }

    const statusRows = await db
      .select({
        count: sql<number>`count(*)::int`,
        status: complianceDocument.verificationStatus,
      })
      .from(complianceDocument)
      .where(whereClause)
      .groupBy(complianceDocument.verificationStatus);

    const byStatus: Record<string, number> = {};
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    const [obligationCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(complianceObligation)
      .where(eq(complianceObligation.isActive, true));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [generatedCount] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.obligationId),
          gte(complianceDocument.createdAt, thirtyDaysAgo),
        ),
      );

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
      await kvStore.set(cacheKey, summary, cacheTtl);
    }

    return summary;
  },
);

export { getDashboardSummary };
