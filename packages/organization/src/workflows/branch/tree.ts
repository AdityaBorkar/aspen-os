import { branch } from "#/db-schemas";
import { buildTree } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getBranchTree = Workflow.name("branch.tree")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const allBranches = await ctx.db
        .select({
          id: branch.id,
          name: branch.name,
          parentBranch: branch.parent_branch,
        })
        .from(branch);

      return buildTree(allBranches);
    }),
  );
