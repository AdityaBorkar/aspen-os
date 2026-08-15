import type { employee } from "#/db-schemas";
import { employeePromotion } from "#/db-schemas";
import { fetchPromotionById } from "#/workflows/utils";

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

    // Update employee record
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

    // This would require access to employee workflow
    // For now, just mark as completed
    const [updated] = await ctx.db
      .update(employeePromotion)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(employeePromotion.id, id))
      .returning();

    return updated;
  });
