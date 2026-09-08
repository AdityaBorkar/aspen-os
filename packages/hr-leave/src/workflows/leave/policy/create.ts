import { leavePolicy } from "#/db-schemas";
import { CreateLeavePolicySchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateLeavePolicySchema,
});

export const createLeavePolicy = Workflow.name("hr.leave.create-leave-policy")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(leavePolicy)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
