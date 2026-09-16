import { leaveEncashment } from "#/db-schemas";
import { assertUpdated, fetchLeaveEncashment, requireStatus } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectLeaveEncashment = Workflow.name("hr.leave.encashment.reject")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const encashment = await fetchLeaveEncashment(ctx.db, id);
    requireStatus(encashment, "pending", `Leave encashment "${id}"`);

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({
        rejected_at: new Date(),
        rejected_by: rejectedBy,
        rejection_reason: rejectionReason,
        status: "rejected",
        updated_at: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return assertUpdated(updated, `Leave encashment "${id}"`);
  });
