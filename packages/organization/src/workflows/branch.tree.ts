import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { branch } from "../db-schemas";
import { buildTree } from "./utils";

export const getBranchTree = Workflow.name("branch.tree")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const allBranches = await ctx.db
        .select({
          id: branch.id,
          name: branch.name,
          parentBranch: branch.parentBranch,
        })
        .from(branch)
        .where(eq(branch.isActive, true));

      return buildTree(allBranches, null);
    }),
  );
