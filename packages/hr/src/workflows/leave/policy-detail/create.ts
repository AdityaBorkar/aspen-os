import { leavePolicyDetail } from "#/db-schemas";
import { CreateLeavePolicyDetailSchema } from "#/types";
import { fetchLeavePolicyById, fetchLeaveTypeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeavePolicyDetailSchema,
});

export const createLeavePolicyDetail = Workflow.name("hr.leave.create-leave-policy-detail")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify leave policy exists
    await fetchLeavePolicyById(ctx.db, parsed.leavePolicyId);

    // Verify leave type exists
    await fetchLeaveTypeById(ctx.db, parsed.leaveType);

    const [result] = await ctx.db
      .insert(leavePolicyDetail)
      .values({
        carry_forward_days: parsed.carryForwardDays ?? 0,
        leave_policy_id: parsed.leavePolicyId,
        leave_type: parsed.leaveType,
        max_days: parsed.maxDays,
      })
      .returning();

    return result;
  });
