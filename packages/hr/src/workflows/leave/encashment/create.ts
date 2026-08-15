import { leaveEncashment } from "#/db-schemas";
import { CreateLeaveEncashmentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateLeaveEncashmentSchema,
});

export const createLeaveEncashment = Workflow.name("hr.leave.create-leave-encashment")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeaveEncashmentSchema, input);

    const [result] = await ctx.db
      .insert(leaveEncashment)
      .values({
        employeeId: parsed.employeeId,
        encashableDays: parsed.encashableDays,
        encashedDays: parsed.encashedDays,
        leavePeriod: parsed.leavePeriod,
        leaveType: parsed.leaveType,
      })
      .returning();

    return result;
  });
