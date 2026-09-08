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
        designation: promotion.new_designation,
        updated_at: new Date(),
      };
      if (promotion.new_grade) {
        updateData.grade = promotion.new_grade;
      }
      if (promotion.new_department) {
        updateData.department = promotion.new_department;
      }
      await tx.update(employee).set(updateData).where(eq(employee.id, promotion.employee_id));

      const [row] = await tx
        .update(employeePromotion)
        .set({
          status: "completed",
          updated_at: new Date(),
        })
        .where(eq(employeePromotion.id, id))
        .returning();

      return assertUpdated(row, `Promotion "${id}"`);
    });

    return updated;
  });
