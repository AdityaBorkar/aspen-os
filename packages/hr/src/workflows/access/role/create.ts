import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { hrRole } from "../../../db-schemas";
import { CreateHrRoleSchema } from "../../../types";

const InputSchema = object({
  input: CreateHrRoleSchema,
});

export const createRole = Workflow.name("hr.access.create-role")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateHrRoleSchema, input);

    const [result] = await ctx.db
      .insert(hrRole)
      .values({
        description: parsed.description,
        isActive: parsed.isActive,
        isSystem: parsed.isSystem,
        name: parsed.name,
      })
      .returning();
    return result;
  });
