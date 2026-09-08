import { employeeCheckin } from "#/db-schemas";
import { CheckinFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(CheckinFiltersSchema, {}),
});

export const listCheckins = Workflow.name("hr.attendance.list-checkins")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeCheckin.employee_id, parsed.employeeId));
    }
    if (parsed.logType) {
      conditions.push(eq(employeeCheckin.log_type, parsed.logType));
    }
    if (parsed.shift) {
      conditions.push(eq(employeeCheckin.shift, parsed.shift));
    }
    if (parsed.deviceId) {
      conditions.push(eq(employeeCheckin.device_id, parsed.deviceId));
    }
    if (parsed.isOffShift !== undefined) {
      conditions.push(eq(employeeCheckin.is_off_shift, parsed.isOffShift));
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
