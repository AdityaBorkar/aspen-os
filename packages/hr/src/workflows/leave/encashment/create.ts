import { leaveEncashment } from "#/db-schemas";
import { CreateLeaveEncashmentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeaveEncashmentSchema,
});

export const createLeaveEncashment = Workflow.name("hr.leave.create-leave-encashment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(leaveEncashment)
      .values({
        employee_id: parsed.employeeId,
        encashable_days: parsed.encashableDays,
        encashed_days: parsed.encashedDays,
        leave_period: parsed.leavePeriod,
        leave_type: parsed.leaveType,
      })
      .returning();

    return result;
  });
