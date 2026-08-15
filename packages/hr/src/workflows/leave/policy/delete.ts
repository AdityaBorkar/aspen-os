import { leavePolicy, leavePolicyDetail } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeavePolicy = Workflow.name("hr.leave.delete-leave-policy")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    // Delete policy details first
    await ctx.db.delete(leavePolicyDetail).where(eq(leavePolicyDetail.leavePolicyId, id));

    const [deleted] = await ctx.db.delete(leavePolicy).where(eq(leavePolicy.id, id)).returning();

    return deleted;
  });
