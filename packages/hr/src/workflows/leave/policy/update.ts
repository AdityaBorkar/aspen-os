import { leavePolicy } from "#/db-schemas";
import { UpdateLeavePolicySchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeavePolicySchema,
});

export const updateLeavePolicy = Workflow.name("hr.leave.update-leave-policy")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeavePolicySchema, patch);

    const [updated] = await ctx.db
      .update(leavePolicy)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leavePolicy.id, id))
      .returning();

    return updated;
  });
