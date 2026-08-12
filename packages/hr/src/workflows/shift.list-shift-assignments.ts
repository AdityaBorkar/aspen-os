import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { shiftAssignment } from "../db-schemas";
import { ShiftAssignmentFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(ShiftAssignmentFiltersSchema),
});

export const listShiftAssignments = Workflow.name(
  "hr.shift.list-shift-assignments",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(ShiftAssignmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(shiftAssignment.employeeId, parsed.employeeId));
    }
    if (parsed.shiftType) {
      conditions.push(eq(shiftAssignment.shiftType, parsed.shiftType));
    }
    if (parsed.status) {
      conditions.push(eq(shiftAssignment.status, parsed.status));
    }
    if (parsed.startDate) {
      conditions.push(sql`${shiftAssignment.startDate} >= ${parsed.startDate}`);
    }
    if (parsed.endDate) {
      conditions.push(sql`${shiftAssignment.endDate} <= ${parsed.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(shiftAssignment).where(whereClause);
  });
