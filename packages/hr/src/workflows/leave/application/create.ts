import { leaveApplication } from "#/db-schemas";
import { CreateLeaveApplicationSchema } from "#/types";
import { checkLeaveBalance, checkLeaveBlockList, fetchLeaveTypeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateLeaveApplicationSchema,
});

export const createLeaveApplication = Workflow.name("hr.leave.create-leave-application")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveApplicationSchema, input);

    // Verify leave type exists
    const leaveTypeRecord = await fetchLeaveTypeById(ctx.db, parsed.leaveType);

    // Check if leave is blocked
    await checkLeaveBlockList(ctx.db, { fromDate: parsed.fromDate, toDate: parsed.toDate });

    // Check leave balance
    if (!leaveTypeRecord.isLeaveWithoutPay) {
      await checkLeaveBalance(ctx.db, {
        days: parseFloat(parsed.totalDays),
        employeeId: parsed.employeeId,
        leaveType: parsed.leaveType,
      });
    }

    const [result] = await ctx.db
      .insert(leaveApplication)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        halfDayDate: parsed.halfDayDate ?? null,
        isHalfDay: parsed.isHalfDay ?? false,
        leaveAllocation: parsed.leaveAllocation ?? null,
        leaveType: parsed.leaveType,
        reason: parsed.reason ?? null,
        toDate: parsed.toDate,
        totalDays: parsed.totalDays,
      })
      .returning();

    return result;
  });
