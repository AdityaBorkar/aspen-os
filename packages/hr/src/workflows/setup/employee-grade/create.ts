import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employeeGrade } from "../../../db-schemas";
import { CreateEmployeeGradeSchema } from "../../../types";

const InputSchema = object({
  input: CreateEmployeeGradeSchema,
});

export const createEmployeeGrade = Workflow.name("hr.setup.create-employee-grade")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEmployeeGradeSchema, input);

    const [result] = await ctx.db
      .insert(employeeGrade)
      .values({
        defaultSalaryStructure: parsed.defaultSalaryStructure ?? null,
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
