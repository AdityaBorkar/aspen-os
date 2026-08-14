import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrUserBranchAccess } from "../../../db-schemas";

const InputSchema = object({
  branchId: pipe(string(), minLength(1, "branchId is required")),
  hrUserId: pipe(string(), minLength(1, "hrUserId is required")),
});

export const revokeBranchAccess = Workflow.name("hr.access.revoke-branch-access")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { hrUserId, branchId } = input;

    await ctx.db
      .delete(hrUserBranchAccess)
      .where(
        and(eq(hrUserBranchAccess.hrUserId, hrUserId), eq(hrUserBranchAccess.branchId, branchId)),
      );
  });
