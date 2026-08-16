import { employeeTransfer } from "#/db-schemas";
import { LIFECYCLE_EVENTS } from "#/pubsub";
import { fetchTransferById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveTransfer = Workflow.name("hr.lifecycle.approve-transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const existing = await fetchTransferById(ctx.db, id);

    const [updated] = await ctx.db
      .update(employeeTransfer)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    if (updated) {
      await ctx.pubsub.publish(LIFECYCLE_EVENTS.TRANSFER_APPROVED, {
        approvedBy,
        employeeId: existing.employeeId,
        transferId: id,
      });
    }

    return updated;
  });
