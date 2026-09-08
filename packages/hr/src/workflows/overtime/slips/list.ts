import { overtimeSlip } from "#/db-schemas";
import { OvertimeSlipFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(OvertimeSlipFiltersSchema, {}),
});

export const listOvertimeSlips = Workflow.name("hr.overtime.list-overtime-slips")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(overtimeSlip.employee_id, parsed.employeeId));
    }
    if (parsed.overtimeType) {
      conditions.push(eq(overtimeSlip.overtime_type, parsed.overtimeType));
    }
    if (parsed.status) {
      conditions.push(eq(overtimeSlip.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(overtimeSlip).where(whereClause);
  });
