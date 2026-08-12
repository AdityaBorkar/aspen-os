import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveAdjustment } from "../db-schemas";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const listLeaveAdjustments = Workflow.name(
  "hr.leave.list-leave-adjustments",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    return ctx.db
      .select()
      .from(leaveAdjustment)
      .where(eq(leaveAdjustment.employeeId, employeeId));
  });
