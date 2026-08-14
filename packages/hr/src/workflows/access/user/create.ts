import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { hrUser } from "../../../db-schemas";
import { CreateHrUserSchema } from "../../../types";

const InputSchema = object({
  input: CreateHrUserSchema,
});

export const createUser = Workflow.name("hr.access.create-user")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateHrUserSchema, input);

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
