import { serviceProvider } from "#/db-schemas";
import { ServiceProviderFiltersSchema } from "#/types";
import { escapeLikeTerm } from "#/utils/escape-like";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional } from "valibot";

export const listSps = Workflow.name("sp.list")
  .input(
    object({
      filters: optional(ServiceProviderFiltersSchema),
    }),
  )
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.status) {
        conditions.push(eq(serviceProvider.status, parsed.status));
      }
      if (parsed.search) {
        const term = `%${escapeLikeTerm(parsed.search)}%`;
        const searchCondition = or(
          ilike(serviceProvider.name, term),
          ilike(serviceProvider.slug, term),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(serviceProvider)
        .where(whereClause)
        .orderBy(asc(serviceProvider.name))
        .limit(parsed.limit ?? 50)
        .offset(parsed.offset ?? 0);
    }),
  );
