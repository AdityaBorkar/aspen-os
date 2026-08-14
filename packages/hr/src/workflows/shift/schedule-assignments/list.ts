import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

import { shiftScheduleAssignment } from "../../../db-schemas";

const InputSchema = object({
  employeeId: optional(pipe(string(), minLength(1, "employeeId is required"))),
});

export const listShiftScheduleAssignments = Workflow.name(
  "hr.shift.list-shift-schedule-assignments",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    const conditions = [];
    if (employeeId) {
      conditions.push(eq(shiftScheduleAssignment.employeeId, employeeId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(shiftScheduleAssignment).where(whereClause);
  });
