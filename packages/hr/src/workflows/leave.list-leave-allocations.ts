import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { leaveAllocation } from "../db-schemas";
import { LeaveAllocationFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(LeaveAllocationFiltersSchema),
});

export const listLeaveAllocations = Workflow.name("hr.leave.list-leave-allocations")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(LeaveAllocationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leaveAllocation.employeeId, parsed.employeeId));
    }
    if (parsed.leaveType) {
      conditions.push(eq(leaveAllocation.leaveType, parsed.leaveType));
    }
    if (parsed.leavePeriod) {
      conditions.push(eq(leaveAllocation.leavePeriod, parsed.leavePeriod));
    }
    if (parsed.status) {
      conditions.push(eq(leaveAllocation.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(leaveAllocation).where(whereClause);
  });
