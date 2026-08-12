import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import { object, optional } from "valibot";

import { serviceProvider } from "../db-schemas";
import { ServiceProviderFiltersSchema } from "../types";

export const listSps = Workflow.name("sp.list")
  .input(
    object({
      filters: optional(ServiceProviderFiltersSchema),
    }),
  )
  .handler(async (input, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (parsed.status) {
        conditions.push(
          eq(
            serviceProvider.status,
            parsed.status as (typeof serviceProvider.status.enumValues)[number],
          ),
        );
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(
          or(
            ilike(serviceProvider.name, term),
            ilike(serviceProvider.slug, term),
          ) as SQL,
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(serviceProvider).where(whereClause);
    });
  });
