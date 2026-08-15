import { employee } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const getByEmployeeId = Workflow.name("hr.employee.get-by-employee-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    const [result] = await ctx.db
      .select()
      .from(employee)
      .where(eq(employee.employeeId, employeeId))
      .limit(1);

    if (!result) {
      throw new Error(`Employee with employee ID "${employeeId}" not found.`);
    }

    return result;
  });
