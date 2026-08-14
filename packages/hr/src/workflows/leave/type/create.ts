import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leaveType } from "../../../db-schemas";
import { CreateLeaveTypeSchema } from "../../../types";

const InputSchema = object({
  input: CreateLeaveTypeSchema,
});

export const createLeaveType = Workflow.name("hr.leave.create-leave-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveTypeSchema, input);

    const [result] = await ctx.db
      .insert(leaveType)
      .values({
        allowNegativeBalance: parsed.allowNegativeBalance ?? false,
        applicableAfterWorkingDays: parsed.applicableAfterWorkingDays ?? 0,
        earnedLeaveFrequency: parsed.earnedLeaveFrequency ?? null,
        includeHolidaysWithinLeaves: parsed.includeHolidaysWithinLeaves ?? false,
        isCarryForward: parsed.isCarryForward ?? false,
        isEarnedLeave: parsed.isEarnedLeave ?? false,
        isLeaveWithoutPay: parsed.isLeaveWithoutPay ?? false,
        isPartiallyPaid: parsed.isPartiallyPaid ?? false,
        maxCarryForwardDays: parsed.maxCarryForwardDays ?? null,
        maxContinuousDaysAllowed: parsed.maxContinuousDaysAllowed ?? null,
        maxDaysAllowed: parsed.maxDaysAllowed,
        name: parsed.name,
      })
      .returning();

    return result;
  });
