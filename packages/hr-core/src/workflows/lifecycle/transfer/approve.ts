import { employeeTransfer } from "#/db-schemas";
import { LIFECYCLE_EVENTS } from "#/pubsub";
import { assertUpdated, fetchTransferById, requireStatus } from "#/workflows/utils";

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
    requireStatus(existing, "pending", `Transfer "${id}"`);

    const [updated] = await ctx.db
      .update(employeeTransfer)
      .set({
        approved_at: new Date(),
        approved_by: approvedBy,
        status: "approved",
        updated_at: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    const transfer = assertUpdated(updated, `Transfer "${id}"`);

    await ctx.pubsub.publish(LIFECYCLE_EVENTS.TRANSFER_APPROVED, {
      approvedBy,
      employeeId: existing.employee_id,
      transferId: id,
    });

    return transfer;
  });
