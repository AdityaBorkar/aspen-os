import { leaveApplication } from "#/db-schemas";
import { CreateLeaveApplicationSchema } from "#/types";
import { assertUpdated, fetchLeaveTypeById } from "#/workflows/fetch";
import { checkLeaveBalance, checkLeaveBlockList, toDays } from "#/workflows/leave-accounts";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeaveApplicationSchema,
});

export const createLeaveApplication = Workflow.name("hr.leave.create-leave-application")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const [leaveTypeRecord] = await Promise.all([
      fetchLeaveTypeById(ctx.db, input.leaveType),
      checkLeaveBlockList(ctx.db, { fromDate: input.fromDate, toDate: input.toDate }),
    ]);

    if (!leaveTypeRecord.isLeaveWithoutPay) {
      await checkLeaveBalance(ctx.db, {
        days: toDays(input.totalDays, "totalDays"),
        employeeId: input.employeeId,
        leaveType: input.leaveType,
      });
    }

    const [result] = await ctx.db
      .insert(leaveApplication)
      .values({
        employeeId: input.employeeId,
        fromDate: input.fromDate,
        halfDayDate: input.halfDayDate ?? null,
        isHalfDay: input.isHalfDay ?? false,
        leaveAllocation: input.leaveAllocation ?? null,
        leaveType: input.leaveType,
        reason: input.reason ?? null,
        toDate: input.toDate,
        totalDays: input.totalDays,
      })
      .returning();

    return assertUpdated(result, "Leave application");
  });
