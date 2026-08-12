import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leaveApplication } from "../db-schemas";
import { CreateLeaveApplicationSchema } from "../types";
import {
  checkLeaveBalance,
  checkLeaveBlockList,
  fetchLeaveTypeById,
} from "./utils";

const InputSchema = object({
  input: CreateLeaveApplicationSchema,
});

export const createLeaveApplication = Workflow.name(
  "hr.leave.create-leave-application",
)
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveApplicationSchema, input);

    // Verify leave type exists
    const leaveTypeRecord = await fetchLeaveTypeById(ctx.db, parsed.leaveType);

    // Check if leave is blocked
    await checkLeaveBlockList(
      ctx.db,
      parsed.employeeId,
      parsed.fromDate,
      parsed.toDate,
    );

    // Check leave balance
    if (!leaveTypeRecord.isLeaveWithoutPay) {
      await checkLeaveBalance(
        ctx.db,
        parsed.employeeId,
        parsed.leaveType,
        parseFloat(parsed.totalDays),
      );
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
