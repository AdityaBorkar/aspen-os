import { hrUserBranchAccess, hrUserRole } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getAccessibleBranches = Workflow.name("hr.access.get-accessible-branches")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId } = input;

    const direct = await ctx.db
      .select({ branchId: hrUserBranchAccess.branch_id })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hr_user_id, hrUserId));

    const roleBased = await ctx.db
      .select({ branchId: hrUserRole.branch_id })
      .from(hrUserRole)
      .where(and(eq(hrUserRole.hr_user_id, hrUserId), isNotNull(hrUserRole.branch_id)));

    const branchIds = new Set<string>();
    for (const directRow of direct) {
      branchIds.add(directRow.branchId);
    }
    for (const roleRow of roleBased) {
      if (roleRow.branchId) {
        branchIds.add(roleRow.branchId);
      }
    }
    return [...branchIds];
  });
