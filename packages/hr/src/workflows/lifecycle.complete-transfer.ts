import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeTransfer } from "../db-schemas";
import { fetchTransferById } from "./utils";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const completeTransfer = Workflow.name("hr.lifecycle.complete-transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const transfer = await fetchTransferById(ctx.db, id);

    // Update employee record
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (transfer.toBranch) {
      updateData.branch = transfer.toBranch;
    }
    if (transfer.toDepartment) {
      updateData.department = transfer.toDepartment;
    }
    if (transfer.toCompany) {
      updateData.company = transfer.toCompany;
    }

    // This would require access to employee workflow
    // For now, just mark as completed
    const [updated] = await ctx.db
      .update(employeeTransfer)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return updated;
  });
