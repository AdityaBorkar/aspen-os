import { employeePromotion } from "#/db-schemas";
import { CreatePromotionSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreatePromotionSchema,
});

export const createPromotion = Workflow.name("hr.lifecycle.create-promotion")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeePromotion)
      .values({
        current_department: parsed.currentDepartment ?? null,
        current_designation: parsed.currentDesignation,
        current_grade: parsed.currentGrade ?? null,
        effective_date: parsed.effectiveDate,
        employee_id: parsed.employeeId,
        new_department: parsed.newDepartment ?? null,
        new_designation: parsed.newDesignation,
        new_grade: parsed.newGrade ?? null,
        reason: parsed.reason ?? null,
        salary_revision: parsed.salaryRevision ?? null,
      })
      .returning();

    return result;
  });
