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
      const updateData: Partial<typeof employee.$inferInsert> = { updated_at: new Date() };
      if (transfer.to_branch) {
        updateData.branch = transfer.to_branch;
      }
      if (transfer.to_department) {
        updateData.department = transfer.to_department;
      }
      if (transfer.to_company) {
        updateData.company = transfer.to_company;
      }
      await tx.update(employee).set(updateData).where(eq(employee.id, transfer.employee_id));

      const [row] = await tx
        .update(employeeTransfer)
        .set({
          status: "completed",
          updated_at: new Date(),
        })
        .where(eq(employeeTransfer.id, id))
        .returning();

      return assertUpdated(row, `Transfer "${id}"`);
    });

    return updated;
  });
