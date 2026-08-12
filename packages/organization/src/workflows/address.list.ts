import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

import { address } from "../db-schemas";
import { AddressFiltersSchema } from "../types";

export const listAddresses = Workflow.name("address.list")
  .input(object({ filters: optional(AddressFiltersSchema) }))
  .handler(async (input, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [];

      if (parsed.country) {
        conditions.push(eq(address.country, parsed.country.toUpperCase()));
      }
      if (parsed.isPrimary !== undefined) {
        conditions.push(eq(address.isPrimary, parsed.isPrimary));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(address).where(whereClause);
    });
  });
