import { leaveAllocation } from "#/db-schemas";

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
          eq(leaveAllocation.employeeId, employeeId),
          eq(leaveAllocation.leavePeriod, leavePeriod),
        ),
      );

    return allocations.map((alloc) => ({
      allocated: Number.parseFloat(alloc.totalDays),
      carryForwarded: Number.parseFloat(alloc.carryForwardedDays),
      earned: Number.parseFloat(alloc.earnedDays),
      leaveType: alloc.leaveType,
      remaining:
        Number.parseFloat(alloc.totalDays) +
        Number.parseFloat(alloc.carryForwardedDays) +
        Number.parseFloat(alloc.earnedDays) -
        Number.parseFloat(alloc.usedDays),
      used: Number.parseFloat(alloc.usedDays),
    }));
  });
