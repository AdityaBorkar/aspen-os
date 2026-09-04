import { employee, employeePromotion } from "#/db-schemas";
import { assertUpdated, fetchPromotionById, requireStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const completePromotion = Workflow.name("hr.lifecycle.complete-promotion")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const promotion = await fetchPromotionById(ctx.db, id);
    requireStatus(promotion, "approved", `Promotion "${id}"`);

    const updated = await ctx.db.transaction(async (tx) => {
      const updateData: Partial<typeof employee.$inferInsert> = {
        designation: promotion.newDesignation,
        updatedAt: new Date(),
      };
      if (promotion.newGrade) {
        updateData.grade = promotion.newGrade;
      }
      if (promotion.newDepartment) {
        updateData.department = promotion.newDepartment;
      }
      await tx.update(employee).set(updateData).where(eq(employee.id, promotion.employeeId));

      const [row] = await tx
        .update(employeePromotion)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(employeePromotion.id, id))
        .returning();

      return assertUpdated(row, `Promotion "${id}"`);
    });

    return updated;
  });
