import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { attendanceRequest } from "../db-schemas";
import { CreateAttendanceRequestSchema } from "../types";

const InputSchema = object({
  input: CreateAttendanceRequestSchema,
});

export const createAttendanceRequest = Workflow.name("hr.attendance.create-attendance-request")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAttendanceRequestSchema, input);

    const [result] = await ctx.db
      .insert(attendanceRequest)
      .values({
        employeeId: parsed.employeeId,
        fromDate: parsed.fromDate,
        reason: parsed.reason,
        toDate: parsed.toDate,
      })
      .returning();

    return result;
  });
