import { employeeGrade } from "#/db-schemas";
import { CreateEmployeeGradeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateEmployeeGradeSchema,
});

export const createEmployeeGrade = Workflow.name("hr.setup.create-employee-grade")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeeGrade)
      .values({
        default_salary_structure: parsed.defaultSalaryStructure ?? null,
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
