import { shiftRequest } from "#/db-schemas";
import { insertShiftAssignment } from "#/workflows/shift-records";
import { assertUpdated, fetchShiftRequestById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveShiftRequest = Workflow.name("hr.shift.approve-shift-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const request = await fetchShiftRequestById(ctx.db, id);
    requireStatus(request, "pending", `Shift request "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      const assignment = await insertShiftAssignment(tx, {
        employeeId: request.employee_id,
        endDate: request.to_date ?? undefined,
        shiftType: request.shift_type,
        startDate: request.from_date,
      });

      const [row] = await tx
        .update(shiftRequest)
        .set({
          approved_at: new Date(),
          approved_by: approvedBy,
          shift_assignment: assignment.id,
          status: "approved",
          updated_at: new Date(),
        })
        .where(eq(shiftRequest.id, id))
        .returning();

      return assertUpdated(row, `Shift request "${id}"`);
    });

    return updated;
  });
