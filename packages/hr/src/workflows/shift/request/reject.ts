import { shiftRequest } from "#/db-schemas";
import { assertUpdated, fetchShiftRequestById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectShiftRequest = Workflow.name("hr.shift.reject-shift-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const request = await fetchShiftRequestById(ctx.db, id);
    requireStatus(request, "pending", `Shift request "${id}"`);

    const [updated] = await ctx.db
      .update(shiftRequest)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(shiftRequest.id, id))
      .returning();

    return assertUpdated(updated, `Shift request "${id}"`);
  });
