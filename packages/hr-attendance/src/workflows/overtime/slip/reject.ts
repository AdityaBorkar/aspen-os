import { overtimeSlip } from "#/db-schemas";
import { assertUpdated, fetchOvertimeSlip, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectOvertimeSlip = Workflow.name("hr.overtime.slip.reject")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const slip = await fetchOvertimeSlip(ctx.db, id);
    requireStatus(slip, "pending", `Overtime slip "${id}"`);

    const [updated] = await ctx.db
      .update(overtimeSlip)
      .set({
        rejected_at: new Date(),
        rejected_by: rejectedBy,
        rejection_reason: rejectionReason,
        status: "rejected",
        updated_at: new Date(),
      })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return assertUpdated(updated, `Overtime slip "${id}"`);
  });
