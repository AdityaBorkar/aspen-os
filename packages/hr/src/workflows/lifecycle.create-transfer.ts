import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employeeTransfer } from "../db-schemas";
import { CreateTransferSchema } from "../types";

const InputSchema = object({
  input: CreateTransferSchema,
});

export const createTransfer = Workflow.name("hr.lifecycle.create-transfer")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTransferSchema, input);

    const [result] = await ctx.db
      .insert(employeeTransfer)
      .values({
        effectiveDate: parsed.effectiveDate,
        employeeId: parsed.employeeId,
        fromBranch: parsed.fromBranch ?? null,
        fromCompany: parsed.fromCompany ?? null,
        fromDepartment: parsed.fromDepartment ?? null,
        reason: parsed.reason ?? null,
        toBranch: parsed.toBranch ?? null,
        toCompany: parsed.toCompany ?? null,
        toDepartment: parsed.toDepartment ?? null,
      })
      .returning();

    return result;
  });
