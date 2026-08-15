import { serviceProvider } from "#/db-schemas";
import { ServiceProviderFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional } from "valibot";

function isServiceProviderStatus(
  value: string,
): value is (typeof serviceProvider.status.enumValues)[number] {
  // SAFETY: drizzle's pgEnum column exposes enumValues as a tuple of the declared enum
  // Literals; widening to readonly string[] is safe because includes() only reads.
  return (serviceProvider.status.enumValues as readonly string[]).includes(value);
}

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

      if (parsed.status && isServiceProviderStatus(parsed.status)) {
        conditions.push(eq(serviceProvider.status, parsed.status));
      }
      if (parsed.search) {
        const term = `%${parsed.search}%`;
        conditions.push(or(ilike(serviceProvider.name, term), ilike(serviceProvider.slug, term))!);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(serviceProvider).where(whereClause);
    }),
  );
