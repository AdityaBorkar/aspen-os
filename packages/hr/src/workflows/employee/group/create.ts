import { employeeGroup } from "#/db-schemas";
import { CreateEmployeeGroupSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateEmployeeGroupSchema,
});

export const createGroup = Workflow.name("hr.employee.create-group")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEmployeeGroupSchema, input);

    const [result] = await ctx.db
      .insert(employeeGroup)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
