import { leaveApplication } from "#/db-schemas";
import { assertUpdated, fetchLeaveApplicationById, requireStatus } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectLeaveApplication = Workflow.name("hr.leave.reject-leave-application")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const application = await fetchLeaveApplicationById(ctx.db, id);
    requireStatus(application, ["draft", "pending"], `Leave application "${id}"`);

    const [updated] = await ctx.db
      .update(leaveApplication)
      .set({
        rejected_at: new Date(),
        rejected_by: rejectedBy,
        rejection_reason: rejectionReason,
        status: "rejected",
        updated_at: new Date(),
      })
      .where(eq(leaveApplication.id, id))
      .returning();

    return assertUpdated(updated, `Leave application "${id}"`);
  });
