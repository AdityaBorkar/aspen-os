import { compensatoryLeaveRequest } from "#/db-schemas";
import { CreateCompensatoryLeaveSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateCompensatoryLeaveSchema,
});

export const createCompensatoryLeave = Workflow.name("hr.leave.create-compensatory-leave")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(compensatoryLeaveRequest)
      .values({
        employee_id: parsed.employeeId,
        leave_type: parsed.leaveType,
        number_of_days: parsed.numberOfDays ?? "1",
        reason: parsed.reason,
        work_date: parsed.workDate,
      })
      .returning();

    return result;
  });
