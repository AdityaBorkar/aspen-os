import { leavePolicyAssignment } from "#/db-schemas";
import { LeavePolicyAssignmentFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(LeavePolicyAssignmentFiltersSchema, {}),
});

export const listLeavePolicyAssignments = Workflow.name("hr.leave.list-leave-policy-assignments")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leavePolicyAssignment.employee_id, parsed.employeeId));
    }
    if (parsed.leavePolicy) {
      conditions.push(eq(leavePolicyAssignment.leave_policy, parsed.leavePolicy));
    }
    if (parsed.leavePeriod) {
      conditions.push(eq(leavePolicyAssignment.leave_period, parsed.leavePeriod));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(leavePolicyAssignment).where(whereClause);
  });
