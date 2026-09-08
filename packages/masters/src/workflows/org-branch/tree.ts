import { orgBranch } from "#/db-schemas";
import { buildOrgBranchTree } from "#/workflows/org-branch/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getOrgBranchTree = Workflow.name("masters.org_branch.tree")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const allBranches = await ctx.db
        .select({
          id: orgBranch.id,
          name: orgBranch.name,
          parentOrgBranch: orgBranch.parent_org_branch,
        })
        .from(orgBranch);

      return buildOrgBranchTree(allBranches);
    }),
  );

// Deprecated alias — prefer getOrgBranchTree.
export const getBranchTree = getOrgBranchTree;
