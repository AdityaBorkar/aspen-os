import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { attendance } from "../db-schemas";
import { AttendanceFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(AttendanceFiltersSchema),
});

export const list = Workflow.name("hr.attendance.list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(AttendanceFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(attendance.employeeId, parsed.employeeId));
    }
    if (parsed.date) {
      conditions.push(eq(attendance.date, parsed.date));
    }
    if (parsed.startDate) {
      conditions.push(sql`${attendance.date} >= ${parsed.startDate}`);
    }
    if (parsed.endDate) {
      conditions.push(sql`${attendance.date} <= ${parsed.endDate}`);
    }
    if (parsed.status) {
      conditions.push(eq(attendance.status, parsed.status));
    }
    if (parsed.shift) {
      conditions.push(eq(attendance.shift, parsed.shift));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(attendance).where(whereClause);
  });
