import { hrUserBranchAccess } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getUserBranches = Workflow.name("hr.access.get-user-branches")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId } = input;

    const records = await ctx.db
      .select({
        accessLevel: hrUserBranchAccess.access_level,
        branchId: hrUserBranchAccess.branch_id,
        id: hrUserBranchAccess.id,
      })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hr_user_id, hrUserId));
    return records;
  });
