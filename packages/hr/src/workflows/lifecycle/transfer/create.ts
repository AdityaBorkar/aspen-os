import { employeeTransfer } from "#/db-schemas";
import { CreateTransferSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateTransferSchema,
});

export const createTransfer = Workflow.name("hr.lifecycle.create-transfer")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeeTransfer)
      .values({
        effective_date: parsed.effectiveDate,
        employee_id: parsed.employeeId,
        from_branch: parsed.fromBranch ?? null,
        from_company: parsed.fromCompany ?? null,
        from_department: parsed.fromDepartment ?? null,
        reason: parsed.reason ?? null,
        to_branch: parsed.toBranch ?? null,
        to_company: parsed.toCompany ?? null,
        to_department: parsed.toDepartment ?? null,
      })
      .returning();

    return result;
  });
