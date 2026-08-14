import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { leavePolicyAssignment } from "../db-schemas";
import { LeavePolicyAssignmentFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(LeavePolicyAssignmentFiltersSchema),
});

export const listLeavePolicyAssignments = Workflow.name("hr.leave.list-leave-policy-assignments")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(LeavePolicyAssignmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leavePolicyAssignment.employeeId, parsed.employeeId));
    }
    if (parsed.leavePolicy) {
      conditions.push(eq(leavePolicyAssignment.leavePolicy, parsed.leavePolicy));
    }
    if (parsed.leavePeriod) {
      conditions.push(eq(leavePolicyAssignment.leavePeriod, parsed.leavePeriod));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(leavePolicyAssignment).where(whereClause);
  });
