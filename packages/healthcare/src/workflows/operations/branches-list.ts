import { healthcareBranch } from "#/db-schemas/branch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional, parse, string } from "valibot";

const BranchesListSchema = object({
  branchId: optional(string(), "main"),
  limit: optional(string()),
});

const BranchesListInputSchema = object({ input: BranchesListSchema });

export const branchesList = Workflow.name("healthcare.operations.branches-list")
  .input(BranchesListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BranchesListSchema, input);
    const rows = await ctx.step.run("list-branches", async () =>
      ctx.db
        .select()
        .from(healthcareBranch)
        .where(eq(healthcareBranch.branch_id, parsed.branchId ?? "main"))
        .limit(100),
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      subdomain: row.subdomain,
    }));
  });
