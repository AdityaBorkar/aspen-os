import { overtimeSlip } from "#/db-schemas";
import { CreateOvertimeSlipSchema } from "#/types";
import { fetchOvertimeType } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateOvertimeSlipSchema,
});

export const createOvertimeSlip = Workflow.name("hr.overtime.slip.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify overtime type exists
    await fetchOvertimeType(ctx.db, parsed.overtimeType);

    const [result] = await ctx.db
      .insert(overtimeSlip)
      .values({
        employee_id: parsed.employeeId,
        from_date: parsed.fromDate,
        holiday_hours: parsed.holidayHours ?? "0",
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        overtime_type: parsed.overtimeType,
        standard_hours: parsed.standardHours ?? "0",
        to_date: parsed.toDate,
        total_overtime_hours: parsed.totalOvertimeHours,
        weekend_hours: parsed.weekendHours ?? "0",
      })
      .returning();

    return result;
  });
