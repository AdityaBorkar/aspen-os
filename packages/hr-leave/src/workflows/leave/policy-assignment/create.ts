import { leavePolicyAssignment } from "#/db-schemas";
import { CreateLeavePolicyAssignmentSchema } from "#/types";
import { fetchLeavePeriodById, fetchLeavePolicyById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeavePolicyAssignmentSchema,
});

export const createLeavePolicyAssignment = Workflow.name("hr.leave.create-leave-policy-assignment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify leave policy exists
    await fetchLeavePolicyById(ctx.db, parsed.leavePolicy);

    // Verify leave period exists
    await fetchLeavePeriodById(ctx.db, parsed.leavePeriod);

    const [result] = await ctx.db
      .insert(leavePolicyAssignment)
      .values({
        effective_from: parsed.effectiveFrom,
        effective_to: parsed.effectiveTo ?? null,
        employee_id: parsed.employeeId,
        leave_period: parsed.leavePeriod,
        leave_policy: parsed.leavePolicy,
      })
      .returning();

    return result;
  });
