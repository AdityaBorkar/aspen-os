import type { KvStoreUnit } from "@aspen-os/platform/server";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { complianceDocument, complianceObligation } from "../db-schema";
import type { DashboardSummary } from "../types";

const CACHE_KEY = "compliance:dashboard:summary";
const DEFAULT_CACHE_TTL = 300;

export class DashboardWorkflow {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly kvStore: KvStoreUnit,
    private readonly cacheTtl: number = DEFAULT_CACHE_TTL,
  ) {}

  async getSummary(branchFilter?: string): Promise<DashboardSummary> {
    const cacheKey = branchFilter ? `${CACHE_KEY}:${branchFilter}` : CACHE_KEY;

    const cached = await this.kvStore.get<DashboardSummary>(cacheKey);
    if (cached) return cached;

    const conditions = [];
    if (branchFilter) {
      conditions.push(eq(complianceDocument.branch, branchFilter));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [counts] = await this.db
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

    const [dateCounts] = await this.db
      .select({
        dueSoon: sql<number>`count(*) filter (where ${complianceDocument.dueDate} is not null and ${complianceDocument.dueDate} <= '${sql.raw(futureStr)}' and ${complianceDocument.dueDate} >= '${sql.raw(nowStr)}' and ${complianceDocument.completedAt} is null)::int`,
        expiringSoon: sql<number>`count(*) filter (where ${complianceDocument.expiryDate} is not null and ${complianceDocument.expiryDate} <= '${sql.raw(futureStr)}' and ${complianceDocument.expiryDate} >= '${sql.raw(nowStr)}')::int`,
      })
      .from(complianceDocument)
      .where(whereClause);

    const categoryRows = await this.db
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

    const sourceRows = await this.db
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

    const branchRows = await this.db
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

    const statusRows = await this.db
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

    const [obligationCount] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(complianceObligation)
      .where(eq(complianceObligation.isActive, true));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [generatedCount] = await this.db
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

    const healthScore = this.computeHealthScore({
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

    await this.kvStore.set(cacheKey, summary, this.cacheTtl);

    return summary;
  }

  private computeHealthScore(data: {
    expired: number;
    overdue: number;
    rejected: number;
    total: number;
    verified: number;
  }): number {
    if (data.total === 0) return 100;

    const verifiedWeight = 1;
    const expiredWeight = -2;
    const overdueWeight = -2;
    const rejectedWeight = -1;

    const score =
      (data.verified * verifiedWeight +
        data.expired * expiredWeight +
        data.overdue * overdueWeight +
        data.rejected * rejectedWeight) /
      data.total;

    const normalized = Math.max(0, Math.min(100, Math.round(score * 100)));
    return normalized;
  }

  async invalidateCache(): Promise<void> {
    await this.kvStore.del(CACHE_KEY);
  }
}
