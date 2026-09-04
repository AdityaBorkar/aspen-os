import { overtimeSlip } from "#/db-schemas";
import { toDays } from "#/workflows/leave-accounts";
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
    const overtimeTypeRecord = await fetchOvertimeTypeById(ctx.db, slip.overtimeType);

    // Calculate amount
    let amount = 0;
    const standardHours = toDays(slip.standardHours, "standardHours");
    const holidayHours = toDays(slip.holidayHours, "holidayHours");
    const weekendHours = toDays(slip.weekendHours, "weekendHours");

    if (overtimeTypeRecord.amountCalculation === "fixed" && overtimeTypeRecord.fixedHourlyRate) {
      const hourlyRate = toDays(overtimeTypeRecord.fixedHourlyRate, "fixedHourlyRate");
      const standardMultiplier = toDays(
        overtimeTypeRecord.standardMultiplier,
        "standardMultiplier",
      );
      const holidayMultiplier = toDays(overtimeTypeRecord.holidayMultiplier, "holidayMultiplier");
      const weekendMultiplier = toDays(overtimeTypeRecord.weekendMultiplier, "weekendMultiplier");

      amount =
        standardHours * hourlyRate * standardMultiplier +
        holidayHours * hourlyRate * holidayMultiplier +
        weekendHours * hourlyRate * weekendMultiplier;
    }

    const [updated] = await ctx.db
      .update(overtimeSlip)
      .set({
        amount: amount.toString(),
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return assertUpdated(updated, `Overtime slip "${id}"`);
  });
