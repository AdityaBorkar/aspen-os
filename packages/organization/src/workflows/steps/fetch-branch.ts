import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { branch } from "../../db-schemas";

export const fetchBranchStep = WorkflowStep.name("fetch-branch")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(branch)
      .where(eq(branch.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Branch with id "${input.id}" not found.`);
    }

    return result;
  });
