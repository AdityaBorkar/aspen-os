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
          approved_at: new Date(),
          approved_by: approvedBy,
          status: "approved",
          updated_at: new Date(),
        })
        .where(eq(employeePromotion.id, id))
        .returning();

      const promotion = assertUpdated(row, `Promotion "${id}"`);

      const employeePatch: Partial<typeof employee.$inferInsert> = {
        designation: existing.new_designation,
        updated_at: new Date(),
      };
      if (existing.new_grade) {
        employeePatch.grade = existing.new_grade;
      }
      if (existing.new_department) {
        employeePatch.department = existing.new_department;
      }

      await tx.update(employee).set(employeePatch).where(eq(employee.id, existing.employee_id));

      return promotion;
    });

    return updated;
  });
