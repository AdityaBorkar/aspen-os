import { overtimeSlip } from "#/db-schemas";
import { toDays } from "#/workflows/day-amounts";
import {
  assertUpdated,
  fetchOvertimeSlipById,
  fetchOvertimeTypeById,
  requireStatus,
} from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveOvertimeSlip = Workflow.name("hr.overtime.approve-overtime-slip")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const slip = await fetchOvertimeSlipById(ctx.db, id);
    requireStatus(slip, "pending", `Overtime slip "${id}"`);
    const overtimeTypeRecord = await fetchOvertimeTypeById(ctx.db, slip.overtime_type);

    // Calculate amount
    let amount = 0;
    const standardHours = toDays(slip.standard_hours, "standardHours");
    const holidayHours = toDays(slip.holiday_hours, "holidayHours");
    const weekendHours = toDays(slip.weekend_hours, "weekendHours");

    if (overtimeTypeRecord.amount_calculation === "fixed" && overtimeTypeRecord.fixed_hourly_rate) {
      const hourlyRate = toDays(overtimeTypeRecord.fixed_hourly_rate, "fixedHourlyRate");
      const standardMultiplier = toDays(
        overtimeTypeRecord.standard_multiplier,
        "standardMultiplier",
      );
      const holidayMultiplier = toDays(overtimeTypeRecord.holiday_multiplier, "holidayMultiplier");
      const weekendMultiplier = toDays(overtimeTypeRecord.weekend_multiplier, "weekendMultiplier");

      amount =
        standardHours * hourlyRate * standardMultiplier +
        holidayHours * hourlyRate * holidayMultiplier +
        weekendHours * hourlyRate * weekendMultiplier;
    }

    const [updated] = await ctx.db
      .update(overtimeSlip)
      .set({
        amount: amount.toString(),
        approved_at: new Date(),
        approved_by: approvedBy,
        status: "approved",
        updated_at: new Date(),
      })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return assertUpdated(updated, `Overtime slip "${id}"`);
  });
