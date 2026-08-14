import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeeGrade } from "../db-schemas";
import { UpdateEmployeeGradeSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateEmployeeGradeSchema,
});

export const updateEmployeeGrade = Workflow.name("hr.setup.update-employee-grade")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateEmployeeGradeSchema, patch);

    const [updated] = await ctx.db
      .update(employeeGrade)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeGrade.id, id))
      .returning();

    return updated;
  });
