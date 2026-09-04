import { employee, employeeTransfer } from "#/db-schemas";
import { assertUpdated, fetchTransferById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const completeTransfer = Workflow.name("hr.lifecycle.complete-transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const transfer = await fetchTransferById(ctx.db, id);
    requireStatus(transfer, "approved", `Transfer "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      const updateData: Partial<typeof employee.$inferInsert> = { updatedAt: new Date() };
      if (transfer.toBranch) {
        updateData.branch = transfer.toBranch;
      }
      if (transfer.toDepartment) {
        updateData.department = transfer.toDepartment;
      }
      if (transfer.toCompany) {
        updateData.company = transfer.toCompany;
      }
      await tx.update(employee).set(updateData).where(eq(employee.id, transfer.employeeId));

      const [row] = await tx
        .update(employeeTransfer)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(employeeTransfer.id, id))
        .returning();

      return assertUpdated(row, `Transfer "${id}"`);
    });

    return updated;
  });
