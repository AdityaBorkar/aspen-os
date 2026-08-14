import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrUserBranchAccess, hrUserRole } from "../db-schemas";

const InputSchema = object({
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const getAccessibleBranches = Workflow.name("hr.access.get-accessible-branches")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId } = input;

    const direct = await ctx.db
      .select({ branchId: hrUserBranchAccess.branchId })
      .from(hrUserBranchAccess)
      .where(eq(hrUserBranchAccess.hrUserId, hrUserId));

    const roleBased = await ctx.db
      .select({ branchId: hrUserRole.branchId })
      .from(hrUserRole)
      .where(and(eq(hrUserRole.hrUserId, hrUserId), isNotNull(hrUserRole.branchId)));

    const branchIds = new Set<string>();
    for (const d of direct) {
      branchIds.add(d.branchId);
    }
    for (const r of roleBased) {
      if (r.branchId) {
        branchIds.add(r.branchId);
      }
    }
    return [...branchIds];
  });
