import { employeeSeparation } from "#/db-schemas";
import { CreateSeparationSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateSeparationSchema,
});

export const createSeparation = Workflow.name("hr.lifecycle.create-separation")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSeparationSchema, input);

    const [result] = await ctx.db
      .insert(employeeSeparation)
      .values({
        employeeId: parsed.employeeId,
        exitDate: parsed.exitDate,
        metadata: parsed.metadata ?? null,
        notes: parsed.notes ?? null,
        reason: parsed.reason ?? null,
        resignationDate: parsed.resignationDate ?? null,
      })
      .returning();

    return result;
  });
