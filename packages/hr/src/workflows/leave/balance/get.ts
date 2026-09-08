import { leaveAllocation } from "#/db-schemas";
import { allocationDays } from "#/workflows/leave-accounts";
import type { AllocationDays } from "#/workflows/leave-accounts";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
  leavePeriod: pipe(string(), minLength(1, "leavePeriod is required")),
});

export const getLeaveBalance = Workflow.name("hr.leave.get-leave-balance")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId, leavePeriod } = input;

    const allocations = await ctx.db
      .select()
      .from(leaveAllocation)
      .where(
        and(
          eq(leaveAllocation.employee_id, employeeId),
          eq(leaveAllocation.leave_period, leavePeriod),
        ),
      );

    const balances: (AllocationDays & { leaveType: string })[] = [];
    for (const alloc of allocations) {
      balances.push({ ...allocationDays(alloc), leaveType: alloc.leave_type });
    }
    return balances;
  });
