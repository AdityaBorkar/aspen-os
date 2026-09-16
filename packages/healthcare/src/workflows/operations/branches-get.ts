import { healthcareBranch } from "#/db-schemas/branch";
import { boardBranchOf } from "#/workflows/shared/board-query";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional, parse, string } from "valibot";

const BranchesGetSchema = object({
  branchId: optional(string(), "main"),
  id: optional(string()),
  subdomain: optional(string()),
});

const BranchesGetInputSchema = object({ input: BranchesGetSchema });

export const branchesGet = Workflow.name("healthcare.operations.branches-get")
  .input(BranchesGetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BranchesGetSchema, input);
    const branchId = boardBranchOf(parsed.branchId);
    const rows = await ctx.step.run("load-branches", async () => {
      if (parsed.id) {
        return ctx.db
          .select()
          .from(healthcareBranch)
          .where(eq(healthcareBranch.id, parsed.id))
          .limit(1);
      }
      if (parsed.subdomain) {
        return ctx.db
          .select()
          .from(healthcareBranch)
          .where(eq(healthcareBranch.subdomain, parsed.subdomain))
          .limit(1);
      }
      return ctx.db
        .select()
        .from(healthcareBranch)
        .where(eq(healthcareBranch.branch_id, branchId))
        .limit(100);
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      subdomain: row.subdomain,
    }));
  });
