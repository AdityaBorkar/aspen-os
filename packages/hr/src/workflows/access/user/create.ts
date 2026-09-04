import { hrUser } from "#/db-schemas";
import { CreateHrUserSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateHrUserSchema,
});

export const createUser = Workflow.name("hr.access.create-user")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(hrUser)
      .values({
        employeeId: parsed.employeeId,
        isActive: parsed.isActive,
        userId: parsed.userId,
      })
      .returning();
    return result;
  });
