import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { overtimeType } from "../db-schemas";
import { CreateOvertimeTypeSchema } from "../types";

const InputSchema = object({
  input: CreateOvertimeTypeSchema,
});

export const createOvertimeType = Workflow.name("hr.overtime.create-overtime-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateOvertimeTypeSchema, input);

    const [result] = await ctx.db
      .insert(overtimeType)
      .values({
        amountCalculation: parsed.amountCalculation ?? "fixed",
        description: parsed.description ?? null,
        fixedHourlyRate: parsed.fixedHourlyRate ?? null,
        holidayMultiplier: parsed.holidayMultiplier ?? "2",
        maxOvertimeHoursPerDay: parsed.maxOvertimeHoursPerDay ?? null,
        name: parsed.name,
        overtimeSalaryComponent: parsed.overtimeSalaryComponent ?? null,
        standardMultiplier: parsed.standardMultiplier ?? "1.5",
        weekendMultiplier: parsed.weekendMultiplier ?? "2",
      })
      .returning();

    return result;
  });
