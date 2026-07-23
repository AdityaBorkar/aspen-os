import { Workflow } from "@aspen-os/framework/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import {
  auditLog,
  member,
  organization,
  serviceProvider,
  session,
  tenant,
} from "../db-schemas";
import type {
  AuditReportFilters,
  LifecycleReportFilters,
  TenantUsageFilters,
} from "../types";
import {
  AuditReportFiltersSchema,
  IdSchema,
  LifecycleReportFiltersSchema,
  TenantUsageFiltersSchema,
} from "../types";

const TenantUsageInputSchema = object({
  filters: optional(TenantUsageFiltersSchema),
});

const LifecycleInputSchema = object({
  filters: optional(LifecycleReportFiltersSchema),
});

const AuditInputSchema = object({
  filters: optional(AuditReportFiltersSchema),
});

const SpPerformanceInputSchema = object({
  spId: optional(IdSchema),
});

const tenantUsage = Workflow.name("report.tenant-usage").handler(
  async (input: { filters?: TenantUsageFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const { filters } = parse(TenantUsageInputSchema, input);
      const parsed = filters ? parse(TenantUsageFiltersSchema, filters) : {};
      const conditions = [];
      if (parsed.status) {
        conditions.push(
          eq(
            tenant.status,
            parsed.status as (typeof tenant.status.enumValues)[number],
          ),
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
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
    });
  },
);

const lifecycleReport = Workflow.name("report.lifecycle").handler(
  async (input: { filters?: LifecycleReportFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const { filters } = parse(LifecycleInputSchema, input);
      const parsed = filters
        ? parse(LifecycleReportFiltersSchema, filters)
        : {};
      const conditions = [];
      if (parsed.status) {
        conditions.push(
          eq(
            tenant.status,
            parsed.status as (typeof tenant.status.enumValues)[number],
          ),
        );
      }
      if (parsed.from) {
        conditions.push(gte(tenant.signupAt, parsed.from));
      }
      if (parsed.to) {
        conditions.push(lte(tenant.signupAt, parsed.to));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRow] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(tenant)
        .where(whereClause);

      const statusRows = await ctx.db
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

      const churnRows = await ctx.db
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

      const [onboardingRow] = await ctx.db
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
    });
  },
);

const auditReport = Workflow.name("report.audit").handler(
  async (input: { filters?: AuditReportFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const { filters } = parse(AuditInputSchema, input);
      const parsed = filters ? parse(AuditReportFiltersSchema, filters) : {};
      const conditions = [];

      if (parsed.action) {
        conditions.push(
          eq(
            auditLog.action,
            parsed.action as (typeof auditLog.action.enumValues)[number],
          ),
        );
      }
      if (parsed.entityType) {
        conditions.push(
          eq(
            auditLog.entityType,
            parsed.entityType as (typeof auditLog.entityType.enumValues)[number],
          ),
        );
      }
      if (parsed.actorId) {
        conditions.push(eq(auditLog.actorId, parsed.actorId));
      }
      if (parsed.from) {
        conditions.push(gte(auditLog.performedAt, parsed.from));
      }
      if (parsed.to) {
        conditions.push(lte(auditLog.performedAt, parsed.to));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;
      const limit = parsed.limit ?? 50;
      const offset = parsed.offset ?? 0;

      return ctx.db
        .select()
        .from(auditLog)
        .where(whereClause)
        .orderBy(desc(auditLog.performedAt))
        .limit(limit)
        .offset(offset);
    });
  },
);

const spPerformance = Workflow.name("report.sp-performance").handler(
  async (input: { spId?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const { spId } = parse(SpPerformanceInputSchema, input);
      const parsedSpId = spId ? parse(IdSchema, spId) : undefined;
      const whereClause = parsedSpId
        ? eq(serviceProvider.id, parsedSpId)
        : undefined;

      const sps = await ctx.db
        .select({
          id: serviceProvider.id,
          name: serviceProvider.name,
        })
        .from(serviceProvider)
        .where(whereClause);

      const results = [];

      for (const sp of sps) {
        const [counts] = await ctx.db
          .select({
            active: sql<number>`count(*) filter (where ${tenant.status} = 'active')::int`,
            total: sql<number>`count(*)::int`,
          })
          .from(tenant)
          .where(eq(tenant.serviceProviderId, sp.id));

        const [onboardingRow] = await ctx.db
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
    });
  },
);

export const reports = {
  auditReport,
  lifecycleReport,
  spPerformance,
  tenantUsage,
};
