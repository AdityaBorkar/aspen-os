import { employeeSeparation } from "#/db-schemas";
import { CreateSeparationSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateSeparationSchema,
});

export const createSeparation = Workflow.name("hr.lifecycle.create-separation")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeeSeparation)
      .values({
        employee_id: parsed.employeeId,
        exit_date: parsed.exitDate,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        reason: parsed.reason ?? null,
        resignation_date: parsed.resignationDate ?? null,
      })
      .returning();

    return result;
  });
