import { employeeGrade } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteEmployeeGrade = Workflow.name("hr.setup.delete-employee-grade")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(employeeGrade)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(employeeGrade.id, id))
      .returning();

    return updated;
  });
