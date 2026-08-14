import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { attendanceRequest } from "../db-schemas";
import { AttendanceRequestFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(AttendanceRequestFiltersSchema),
});

export const listAttendanceRequests = Workflow.name("hr.attendance.list-attendance-requests")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(AttendanceRequestFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(attendanceRequest.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(attendanceRequest.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(attendanceRequest).where(whereClause);
  });
