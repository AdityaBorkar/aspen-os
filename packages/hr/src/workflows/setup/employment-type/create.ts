import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employmentType } from "../../../db-schemas";
import { CreateEmploymentTypeSchema } from "../../../types";

const InputSchema = object({
  input: CreateEmploymentTypeSchema,
});

export const createEmploymentType = Workflow.name("hr.setup.create-employment-type")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEmploymentTypeSchema, input);

    const [result] = await ctx.db
      .insert(employmentType)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
