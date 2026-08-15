import { overtimeSlip } from "#/db-schemas";
import { fetchOvertimeSlipById, fetchOvertimeTypeById } from "#/workflows/utils";

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
    const overtimeTypeRecord = await fetchOvertimeTypeById(ctx.db, slip.overtimeType);

    // Calculate amount
    let amount = 0;
    const standardHours = Number.parseFloat(slip.standardHours);
    const holidayHours = Number.parseFloat(slip.holidayHours);
    const weekendHours = Number.parseFloat(slip.weekendHours);

    if (overtimeTypeRecord.amountCalculation === "fixed" && overtimeTypeRecord.fixedHourlyRate) {
      const hourlyRate = Number.parseFloat(overtimeTypeRecord.fixedHourlyRate);
      const standardMultiplier = Number.parseFloat(overtimeTypeRecord.standardMultiplier);
      const holidayMultiplier = Number.parseFloat(overtimeTypeRecord.holidayMultiplier);
      const weekendMultiplier = Number.parseFloat(overtimeTypeRecord.weekendMultiplier);

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

    return updated;
  });
