import { leaveEncashment } from "#/db-schemas";
import { assertUpdated, fetchLeaveEncashmentById, requireStatus } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveLeaveEncashment = Workflow.name("hr.leave.approve-leave-encashment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const encashment = await fetchLeaveEncashmentById(ctx.db, id);
    requireStatus(encashment, "pending", `Leave encashment "${id}"`);

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({
        approved_at: new Date(),
        approved_by: approvedBy,
        status: "approved",
        updated_at: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return assertUpdated(updated, `Leave encashment "${id}"`);
  });
