import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveAllocation } from "../db-schemas";

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
      allocated: parseFloat(alloc.totalDays),
      carryForwarded: parseFloat(alloc.carryForwardedDays),
      earned: parseFloat(alloc.earnedDays),
      leaveType: alloc.leaveType,
      remaining:
        parseFloat(alloc.totalDays) +
        parseFloat(alloc.carryForwardedDays) +
        parseFloat(alloc.earnedDays) -
        parseFloat(alloc.usedDays),
      used: parseFloat(alloc.usedDays),
    }));
  });
