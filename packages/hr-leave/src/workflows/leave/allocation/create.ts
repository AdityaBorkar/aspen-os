import { CreateLeaveAllocationSchema } from "#/types";
import { insertLeaveAllocation } from "#/workflows/leave-accounts";
import { fetchLeavePeriodById, fetchLeaveTypeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeaveAllocationSchema,
});

export const createLeaveAllocation = Workflow.name("hr.leave.create-leave-allocation")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    await Promise.all([
      fetchLeaveTypeById(ctx.db, input.leaveType),
      fetchLeavePeriodById(ctx.db, input.leavePeriod),
    ]);

    return insertLeaveAllocation(ctx.db, {
      carryForwardedDays: input.carryForwardedDays ?? "0",
      earnedDays: input.earnedDays ?? "0",
      employeeId: input.employeeId,
      leavePeriod: input.leavePeriod,
      leavePolicyAssignment: input.leavePolicyAssignment ?? null,
      leaveType: input.leaveType,
      totalDays: input.totalDays,
      usedDays: input.usedDays ?? "0",
    });
  });
