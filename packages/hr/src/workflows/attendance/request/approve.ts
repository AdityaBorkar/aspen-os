import { attendanceRequest } from "#/db-schemas";
import { assertUpdated, fetchAttendanceRequestById, requireStatus } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveAttendanceRequest = Workflow.name("hr.attendance.approve-attendance-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const request = await fetchAttendanceRequestById(ctx.db, id);
    requireStatus(request, "pending", `Attendance request "${id}"`);

    const [updated] = await ctx.db
      .update(attendanceRequest)
      .set({
        approved_at: new Date(),
        approved_by: approvedBy,
        status: "approved",
        updated_at: new Date(),
      })
      .where(eq(attendanceRequest.id, id))
      .returning();

    return assertUpdated(updated, `Attendance request "${id}"`);
  });
