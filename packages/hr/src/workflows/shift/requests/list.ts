import { shiftRequest } from "#/db-schemas";
import { ShiftRequestFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(ShiftRequestFiltersSchema, {}),
});

export const listShiftRequests = Workflow.name("hr.shift.list-shift-requests")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(shiftRequest.employee_id, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(shiftRequest.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(shiftRequest).where(whereClause);
  });
