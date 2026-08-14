import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftRequest } from "../../../db-schemas";
import { createShiftAssignment, fetchShiftRequestById } from "../../utils";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveShiftRequest = Workflow.name("hr.shift.approve-shift-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const request = await fetchShiftRequestById(ctx.db, id);

    // Create shift assignment
    const assignment = await createShiftAssignment(ctx.db, {
      employeeId: request.employeeId,
      endDate: request.toDate ?? undefined,
      shiftType: request.shiftType,
      startDate: request.fromDate,
    });

    if (!assignment) {
      throw new Error("Failed to create shift assignment.");
    }

    // Update request status
    const [updated] = await ctx.db
      .update(shiftRequest)
      .set({
        approvedAt: new Date(),
        approvedBy,
        shiftAssignment: assignment.id,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(shiftRequest.id, id))
      .returning();

    return updated;
  });
