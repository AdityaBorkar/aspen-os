import { branch } from "#/db-schemas";
import { BranchFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const listBranches = Workflow.name("branch.list")
  .input(object({ filters: optional(BranchFiltersSchema) }))
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [];

      if (parsed.type) {
        conditions.push(eq(branch.type, parsed.type));
      }
      if (parsed.isActive !== undefined) {
        conditions.push(eq(branch.isActive, parsed.isActive));
      }
      if (parsed.country) {
        conditions.push(eq(branch.country, parsed.country.toUpperCase()));
      }
      if (parsed.parentBranch) {
        conditions.push(eq(branch.parentBranch, parsed.parentBranch));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(branch).where(whereClause);
    }),
  );
