import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { leavePolicy } from "../db-schemas";
import { CreateLeavePolicySchema } from "../types";

const InputSchema = object({
  input: CreateLeavePolicySchema,
});

export const createLeavePolicy = Workflow.name("hr.leave.create-leave-policy")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLeavePolicySchema, input);

    const [result] = await ctx.db
      .insert(leavePolicy)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
      })
      .returning();

    return result;
  });
