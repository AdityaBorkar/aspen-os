import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { employeeCheckin } from "../db-schemas";
import { CheckinFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(CheckinFiltersSchema),
});

export const listCheckins = Workflow.name("hr.attendance.list-checkins")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(CheckinFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeCheckin.employeeId, parsed.employeeId));
    }
    if (parsed.logType) {
      conditions.push(eq(employeeCheckin.logType, parsed.logType));
    }
    if (parsed.shift) {
      conditions.push(eq(employeeCheckin.shift, parsed.shift));
    }
    if (parsed.deviceId) {
      conditions.push(eq(employeeCheckin.deviceId, parsed.deviceId));
    }
    if (parsed.isOffShift !== undefined) {
      conditions.push(eq(employeeCheckin.isOffShift, parsed.isOffShift));
    }
    if (parsed.startDate) {
      conditions.push(sql`${employeeCheckin.time} >= ${new Date(parsed.startDate)}`);
    }
    if (parsed.endDate) {
      conditions.push(sql`${employeeCheckin.time} <= ${new Date(parsed.endDate)}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(employeeCheckin).where(whereClause);
  });
