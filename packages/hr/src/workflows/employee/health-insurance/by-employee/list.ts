import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeHealthInsurance } from "../../../../db-schemas";

const InputSchema = object({
  employeeId: pipe(string(), minLength(1, "employeeId is required")),
});

export const listHealthInsuranceByEmployee = Workflow.name(
  "hr.employee.list-health-insurance-by-employee",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { employeeId } = input;

    return ctx.db
      .select()
      .from(employeeHealthInsurance)
      .where(eq(employeeHealthInsurance.employeeId, employeeId));
  });
