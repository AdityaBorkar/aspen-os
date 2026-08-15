import { employeeHealthInsurance } from "#/db-schemas";
import { CreateHealthInsuranceSchema } from "#/types";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateHealthInsuranceSchema,
});

export const createHealthInsurance = Workflow.name("hr.employee.create-health-insurance")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateHealthInsuranceSchema, input);

    // Verify employee exists
    await fetchEmployeeById(ctx.db, parsed.employeeId);

    const [result] = await ctx.db
      .insert(employeeHealthInsurance)
      .values({
        coverageDetails: parsed.coverageDetails ?? null,
        employeeId: parsed.employeeId,
        endDate: parsed.endDate ?? null,
        insurer: parsed.insurer,
        metadata: parsed.metadata ?? null,
        policyNumber: parsed.policyNumber,
        premiumAmount: parsed.premiumAmount ?? null,
        startDate: parsed.startDate,
      })
      .returning();

    return result;
  });
