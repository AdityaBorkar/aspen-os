import { employeeHealthInsurance } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteHealthInsurance = Workflow.name("hr.employee.delete-health-insurance")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(employeeHealthInsurance)
      .where(eq(employeeHealthInsurance.id, id))
      .returning();

    return deleted;
  });
