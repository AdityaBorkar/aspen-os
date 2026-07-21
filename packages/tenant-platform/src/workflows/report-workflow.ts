import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  auditLog,
  member,
  organization,
  serviceProvider,
  session,
  tenant,
} from "../db-schema";

type DB = NodePgDatabase<Record<string, never>>;

export interface TenantUsageFilters {
  status?: string;
}

export interface LifecycleReportFilters {
  from?: Date;
  status?: string;
  to?: Date;
}

export interface AuditReportFilters {
  action?: string;
  actorId?: string;
  entityType?: string;
  from?: Date;
  limit?: number;
  offset?: number;
  to?: Date;
}

export class ReportWorkflow {
  constructor(private readonly db: DB) {}

  async tenantUsage(filters?: TenantUsageFilters) {
    const conditions = [];
    if (filters?.status) {
      conditions.push(
        eq(
          tenant.status,
          filters.status as (typeof tenant.status.enumValues)[number],
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select({
        activeSessions: sql<number>`count(distinct ${session.id}) filter (where ${session.expiresAt} > now())::int`,
        id: tenant.id,
        name: organization.name,
        plan: tenant.plan,
        signupAt: tenant.signupAt,
        slug: organization.slug,
        status: tenant.status,
        userCount: sql<number>`count(distinct ${member.id})::int`,
      })
      .from(tenant)
      .leftJoin(organization, eq(organization.id, tenant.id))
      .leftJoin(member, eq(member.organizationId, tenant.id))
      .leftJoin(session, eq(session.activeOrganizationId, tenant.id))
      .where(whereClause)
      .groupBy(tenant.id, organization.name, organization.slug);
  }

  async lifecycleReport(filters?: LifecycleReportFilters) {
    const conditions = [];
    if (filters?.status) {
      conditions.push(
        eq(
          tenant.status,
          filters.status as (typeof tenant.status.enumValues)[number],
        ),
      );
    }
    if (filters?.from) {
      conditions.push(gte(tenant.signupAt, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(tenant.signupAt, filters.to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(tenant)
      .where(whereClause);

    const statusRows = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        status: tenant.status,
      })
      .from(tenant)
      .where(whereClause)
      .groupBy(tenant.status);

    const byStatus: Record<string, number> = {};
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    const churnRows = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        reason: tenant.churnReason,
      })
      .from(tenant)
      .where(and(whereClause, sql`${tenant.churnReason} is not null`))
      .groupBy(tenant.churnReason);

    const churnReasons = churnRows
      .filter((row) => row.reason !== null)
      .map((row) => ({ count: row.count, reason: row.reason as string }));

    const [onboardingRow] = await this.db
      .select({
        avgDays: sql<
          number | null
        >`avg(extract(epoch from (coalesce(${tenant.updatedAt}, now()) - ${tenant.signupAt})) / 86400)::int`,
      })
      .from(tenant)
      .where(whereClause);

    return {
      avgOnboardingDays: onboardingRow?.avgDays ?? null,
      byStatus,
      churnReasons,
      total: totalRow?.total ?? 0,
    };
  }

  async auditReport(filters?: AuditReportFilters) {
    const conditions = [];

    if (filters?.action) {
      conditions.push(
        eq(
          auditLog.action,
          filters.action as (typeof auditLog.action.enumValues)[number],
        ),
      );
    }
    if (filters?.entityType) {
      conditions.push(
        eq(
          auditLog.entityType,
          filters.entityType as (typeof auditLog.entityType.enumValues)[number],
        ),
      );
    }
    if (filters?.actorId) {
      conditions.push(eq(auditLog.actorId, filters.actorId));
    }
    if (filters?.from) {
      conditions.push(gte(auditLog.performedAt, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(auditLog.performedAt, filters.to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    return this.db
      .select()
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.performedAt))
      .limit(limit)
      .offset(offset);
  }

  async spPerformance(spId?: string) {
    const whereClause = spId ? eq(serviceProvider.id, spId) : undefined;

    const sps = await this.db
      .select({
        id: serviceProvider.id,
        name: serviceProvider.name,
      })
      .from(serviceProvider)
      .where(whereClause);

    const results = [];

    for (const sp of sps) {
      const [counts] = await this.db
        .select({
          active: sql<number>`count(*) filter (where ${tenant.status} = 'active')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(tenant)
        .where(eq(tenant.serviceProviderId, sp.id));

      const [onboardingRow] = await this.db
        .select({
          avgDays: sql<
            number | null
          >`avg(extract(epoch from (coalesce(${tenant.updatedAt}, now()) - ${tenant.signupAt})) / 86400)::int`,
        })
        .from(tenant)
        .where(eq(tenant.serviceProviderId, sp.id));

      const totalTenants = counts?.total ?? 0;
      const activeTenants = counts?.active ?? 0;

      results.push({
        activeTenants,
        avgOnboardingDays: onboardingRow?.avgDays ?? null,
        completionRate:
          totalTenants > 0
            ? Math.round((activeTenants / totalTenants) * 100)
            : 0,
        serviceProviderId: sp.id,
        serviceProviderName: sp.name,
        totalTenants,
      });
    }

    return results;
  }
}
