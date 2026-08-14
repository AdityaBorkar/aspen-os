import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrUserBranchAccess, hrUserRole } from "../db-schemas";

const InputSchema = object({
  branchId: pipe(string(), minLength(1, "branchId is required")),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const hasBranchAccess = Workflow.name("hr.access.has-branch-access")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, branchId } = input;

    const [direct] = await ctx.db
      .select({ id: hrUserBranchAccess.id })
      .from(hrUserBranchAccess)
      .where(
        and(eq(hrUserBranchAccess.hrUserId, hrUserId), eq(hrUserBranchAccess.branchId, branchId)),
      )
      .limit(1);
    if (direct) {
      return true;
    }

    const [roleBased] = await ctx.db
      .select({ id: hrUserRole.id })
      .from(hrUserRole)
      .where(and(eq(hrUserRole.hrUserId, hrUserId), eq(hrUserRole.branchId, branchId)))
      .limit(1);
    return Boolean(roleBased);
  });
