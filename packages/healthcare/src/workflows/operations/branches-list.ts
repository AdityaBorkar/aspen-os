import { healthcareBranch } from "#/db-schemas/branch";
import { BranchIdSchema } from "#/schemas/utils";
import { boardBranchOf, boardLimitOf } from "#/workflows/shared/board-query";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { integer, number, object, optional, parse, pipe } from "valibot";

const BranchesListSchema = object({
  branchId: BranchIdSchema,
  limit: optional(pipe(number(), integer())),
  offset: optional(pipe(number(), integer())),
});

const BranchesListInputSchema = object({ input: BranchesListSchema });

export const branchesList = Workflow.name("healthcare.operations.branches-list")
  .input(BranchesListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BranchesListSchema, input);
    const branchId = boardBranchOf(parsed.branchId);
    const rows = await ctx.step.run("list-branches", async () =>
      ctx.db
        .select()
        .from(healthcareBranch)
        .where(eq(healthcareBranch.branch_id, branchId))
        .orderBy(asc(healthcareBranch.name))
        .limit(boardLimitOf(parsed.limit, 100, 500))
        .offset(parsed.offset ?? 0),
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      subdomain: row.subdomain,
    }));
  });
