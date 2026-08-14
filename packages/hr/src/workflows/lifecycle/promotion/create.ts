import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employeePromotion } from "../../../db-schemas";
import { CreatePromotionSchema } from "../../../types";

const InputSchema = object({
  input: CreatePromotionSchema,
});

export const createPromotion = Workflow.name("hr.lifecycle.create-promotion")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePromotionSchema, input);

    const [result] = await ctx.db
      .insert(employeePromotion)
      .values({
        currentDepartment: parsed.currentDepartment ?? null,
        currentDesignation: parsed.currentDesignation,
        currentGrade: parsed.currentGrade ?? null,
        effectiveDate: parsed.effectiveDate,
        employeeId: parsed.employeeId,
        newDepartment: parsed.newDepartment ?? null,
        newDesignation: parsed.newDesignation,
        newGrade: parsed.newGrade ?? null,
        reason: parsed.reason ?? null,
        salaryRevision: parsed.salaryRevision ?? null,
      })
      .returning();

    return result;
  });
