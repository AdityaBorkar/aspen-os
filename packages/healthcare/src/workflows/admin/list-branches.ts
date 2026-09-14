import { healthcareBranch } from "#/db-schemas/branch";
import { BranchFiltersSchema } from "#/schemas/admin";
import { toBranchDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListBranchesInputSchema = object({ input: BranchFiltersSchema });

export const listBranches = Workflow.name("healthcare.admin.list-branches")
  .input(ListBranchesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BranchFiltersSchema, input);
    const rows = await ctx.step.run("list-branches", async () => {
      const conditions: SQL[] = [];
      if (parsed.status) {
        conditions.push(eq(healthcareBranch.status, parsed.status));
      }
      const base = ctx.db.select().from(healthcareBranch);
      if (conditions.length > 0) {
        return base
          .where(and(...conditions))
          .orderBy(asc(healthcareBranch.name))
          .limit(parsed.limit ?? 100)
          .offset(parsed.offset ?? 0);
      }
      return base
        .orderBy(asc(healthcareBranch.name))
        .limit(parsed.limit ?? 100)
        .offset(parsed.offset ?? 0);
    });
    return rows.map(toBranchDto);
  });
