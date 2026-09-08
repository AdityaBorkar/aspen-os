import { employeeHealthInsurance } from "#/db-schemas";
import { CreateHealthInsuranceSchema } from "#/types";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateHealthInsuranceSchema,
});

export const createHealthInsurance = Workflow.name("hr.employee.create-health-insurance")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify employee exists
    await fetchEmployeeById(ctx.db, parsed.employeeId);

    const [result] = await ctx.db
      .insert(employeeHealthInsurance)
      .values({
        coverage_details: parsed.coverageDetails ?? null,
        employee_id: parsed.employeeId,
        end_date: parsed.endDate ?? null,
        insurer: parsed.insurer,
        metadata: parsed.metadata ?? null,
        policy_number: parsed.policyNumber,
        premium_amount: parsed.premiumAmount ?? null,
        start_date: parsed.startDate,
      })
      .returning();

    return result;
  });
