import { managedOrganization } from "#/db-schemas";
import { OrganizationFiltersSchema } from "#/types";
import { escapeLikeTerm } from "#/utils/escape-like";
import { tenantProjection } from "#/workflow-steps/tenant-projection";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional } from "valibot";

export const listOrganizations = Workflow.name("organization.list")
  .input(
    object({
      filters: optional(OrganizationFiltersSchema),
    }),
  )
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.search) {
        const term = `%${escapeLikeTerm(parsed.search)}%`;
        const searchCondition = or(ilike(organization.name, term), ilike(organization.slug, term));
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select(tenantProjection)
        .from(managedOrganization)
        .innerJoin(organization, eq(organization.id, managedOrganization.id))
        .where(whereClause)
        .orderBy(asc(organization.name))
        .limit(parsed.limit ?? 50)
        .offset(parsed.offset ?? 0);
    }),
  );
