import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeHealthInsurance } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getHealthInsuranceById = Workflow.name("hr.employee.get-health-insurance-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeHealthInsurance)
      .where(eq(employeeHealthInsurance.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Health insurance with id "${id}" not found.`);
    }

    return result;
  });
