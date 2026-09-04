import { employee, employeePromotion } from "#/db-schemas";
import { assertUpdated, fetchPromotionById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approvePromotion = Workflow.name("hr.lifecycle.approve-promotion")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const existing = await fetchPromotionById(ctx.db, id);
    requireStatus(existing, "pending", `Promotion "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .update(employeePromotion)
        .set({
          approvedAt: new Date(),
          approvedBy,
          status: "approved",
          updatedAt: new Date(),
        })
        .where(eq(employeePromotion.id, id))
        .returning();

      const promotion = assertUpdated(row, `Promotion "${id}"`);

      const employeePatch: Partial<typeof employee.$inferInsert> = {
        designation: existing.newDesignation,
        updatedAt: new Date(),
      };
      if (existing.newGrade) {
        employeePatch.grade = existing.newGrade;
      }
      if (existing.newDepartment) {
        employeePatch.department = existing.newDepartment;
      }

      await tx.update(employee).set(employeePatch).where(eq(employee.id, existing.employeeId));

      return promotion;
    });

    return updated;
  });
