import { tenant } from "#/db-schemas";
import { TenantFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional } from "valibot";

function isTenantStatus(value: string): value is (typeof tenant.status.enumValues)[number] {
  // SAFETY: drizzle's pgEnum column exposes enumValues as a tuple of the declared enum
  // Literals; widening to readonly string[] is safe because includes() only reads.
  return (tenant.status.enumValues as readonly string[]).includes(value);
}

export const listTenants = Workflow.name("tenant.list")
  .input(
    object({
      filters: optional(TenantFiltersSchema),
    }),
  )
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.status && isTenantStatus(parsed.status)) {
        conditions.push(eq(tenant.status, parsed.status));
      }
      if (parsed.plan) {
        conditions.push(eq(tenant.plan, parsed.plan));
      }
      if (parsed.serviceProviderId) {
        conditions.push(eq(tenant.serviceProviderId, parsed.serviceProviderId));
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(or(ilike(organization.name, term), ilike(organization.slug, term))!);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select({
          createdAt: organization.createdAt,
          id: organization.id,
          logo: organization.logo,
          name: organization.name,
          plan: tenant.plan,
          serviceProviderId: tenant.serviceProviderId,
          signupAt: tenant.signupAt,
          slug: organization.slug,
          status: tenant.status,
        })
        .from(tenant)
        .leftJoin(organization, eq(organization.id, tenant.id))
        .where(whereClause);
    }),
  );
