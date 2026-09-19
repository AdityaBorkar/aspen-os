import { employeePromotion } from "#/db-schemas";
import { CreatePromotionSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreatePromotionSchema,
});

export const createPromotion = Workflow.name("hr.transition.create-promotion")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeePromotion)
      .values({
        current_department: parsed.currentDepartment ?? null,
        effective_date: parsed.effectiveDate,
        employee_id: parsed.employeeId,
        new_department: parsed.newDepartment ?? null,
        reason: parsed.reason ?? null,
        salary_revision: parsed.salaryRevision ?? null,
      })
      .returning();

    return result;
  });
