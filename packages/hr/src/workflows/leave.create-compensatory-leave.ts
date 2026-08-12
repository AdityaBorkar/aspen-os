import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { compensatoryLeaveRequest } from "../db-schemas";
import { CreateCompensatoryLeaveSchema } from "../types";

const InputSchema = object({
  input: CreateCompensatoryLeaveSchema,
});

export const createCompensatoryLeave = Workflow.name(
  "hr.leave.create-compensatory-leave",
)
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateCompensatoryLeaveSchema, input);

    const [result] = await ctx.db
      .insert(compensatoryLeaveRequest)
      .values({
        employeeId: parsed.employeeId,
        leaveType: parsed.leaveType,
        numberOfDays: parsed.numberOfDays ?? "1",
        reason: parsed.reason,
        workDate: parsed.workDate,
      })
      .returning();

    return result;
  });
