import { employeeTransfer } from "#/db-schemas";
import { assertUpdated, fetchTransferById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectTransfer = Workflow.name("hr.lifecycle.reject-transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const transfer = await fetchTransferById(ctx.db, id);
    requireStatus(transfer, "pending", `Transfer "${id}"`);

    const [updated] = await ctx.db
      .update(employeeTransfer)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return assertUpdated(updated, `Transfer "${id}"`);
  });
