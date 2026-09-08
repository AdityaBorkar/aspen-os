import { overtimeType } from "#/db-schemas";
import { CreateOvertimeTypeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateOvertimeTypeSchema,
});

export const createOvertimeType = Workflow.name("hr.overtime.create-overtime-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(overtimeType)
      .values({
        amount_calculation: parsed.amountCalculation ?? "fixed",
        description: parsed.description ?? null,
        fixed_hourly_rate: parsed.fixedHourlyRate ?? null,
        holiday_multiplier: parsed.holidayMultiplier ?? "2",
        max_overtime_hours_per_day: parsed.maxOvertimeHoursPerDay ?? null,
        name: parsed.name,
        overtime_salary_component: parsed.overtimeSalaryComponent ?? null,
        standard_multiplier: parsed.standardMultiplier ?? "1.5",
        weekend_multiplier: parsed.weekendMultiplier ?? "2",
      })
      .returning();

    return result;
  });
