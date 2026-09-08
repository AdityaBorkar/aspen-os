import { managedOrganization } from "#/db-schemas";
import { OrganizationFiltersSchema } from "#/types";
import { escapeLikeTerm } from "#/utils/escape-like";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, ilike, or } from "drizzle-orm";
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
        const searchCondition = or(
          ilike(managedOrganization.name, term),
          ilike(managedOrganization.slug, term),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(managedOrganization)
        .where(whereClause)
        .orderBy(asc(managedOrganization.name))
        .limit(parsed.limit ?? 50)
        .offset(parsed.offset ?? 0);
    }),
  );
