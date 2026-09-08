import { hrUserBranchAccess } from "#/db-schemas";
import { GrantBranchAccessSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: GrantBranchAccessSchema,
});

export const grantBranchAccess = Workflow.name("hr.access.grant-branch-access")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(hrUserBranchAccess)
      .values({
        access_level: parsed.accessLevel,
        branch_id: parsed.branchId,
        hr_user_id: parsed.hrUserId,
      })
      .returning();
    return result;
  });
