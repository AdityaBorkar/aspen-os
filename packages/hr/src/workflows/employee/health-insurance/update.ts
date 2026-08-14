import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeeHealthInsurance } from "../../../db-schemas";
import { UpdateHealthInsuranceSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateHealthInsuranceSchema,
});

export const updateHealthInsurance = Workflow.name("hr.employee.update-health-insurance")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateHealthInsuranceSchema, patch);

    const [updated] = await ctx.db
      .update(employeeHealthInsurance)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeHealthInsurance.id, id))
      .returning();

    return updated;
  });
