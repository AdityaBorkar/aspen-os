import { compensatoryLeaveRequest } from "#/db-schemas";
import { assertUpdated, fetchCompensatoryLeaveById, requireStatus } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectCompensatoryLeave = Workflow.name("hr.leave.reject-compensatory-leave")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const request = await fetchCompensatoryLeaveById(ctx.db, id);
    requireStatus(request, "pending", `Compensatory leave request "${id}"`);

    const [updated] = await ctx.db
      .update(compensatoryLeaveRequest)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return assertUpdated(updated, `Compensatory leave request "${id}"`);
  });
