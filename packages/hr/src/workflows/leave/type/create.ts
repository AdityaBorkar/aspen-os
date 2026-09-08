import { leaveType } from "#/db-schemas";
import { CreateLeaveTypeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeaveTypeSchema,
});

export const createLeaveType = Workflow.name("hr.leave.create-leave-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(leaveType)
      .values({
        allow_negative_balance: parsed.allowNegativeBalance ?? false,
        applicable_after_working_days: parsed.applicableAfterWorkingDays ?? 0,
        earned_leave_frequency: parsed.earnedLeaveFrequency ?? null,
        include_holidays_within_leaves: parsed.includeHolidaysWithinLeaves ?? false,
        is_carry_forward: parsed.isCarryForward ?? false,
        is_earned_leave: parsed.isEarnedLeave ?? false,
        is_leave_without_pay: parsed.isLeaveWithoutPay ?? false,
        is_partially_paid: parsed.isPartiallyPaid ?? false,
        max_carry_forward_days: parsed.maxCarryForwardDays ?? null,
        max_continuous_days_allowed: parsed.maxContinuousDaysAllowed ?? null,
        max_days_allowed: parsed.maxDaysAllowed,
        name: parsed.name,
      })
      .returning();

    return result;
  });
