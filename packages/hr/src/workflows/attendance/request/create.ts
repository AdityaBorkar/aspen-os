import { attendanceRequest } from "#/db-schemas";
import { CreateAttendanceRequestSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateAttendanceRequestSchema,
});

export const createAttendanceRequest = Workflow.name("hr.attendance.create-attendance-request")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(attendanceRequest)
      .values({
        employee_id: parsed.employeeId,
        from_date: parsed.fromDate,
        reason: parsed.reason,
        to_date: parsed.toDate,
      })
      .returning();

    return result;
  });
