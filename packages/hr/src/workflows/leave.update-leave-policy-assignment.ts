import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { leavePolicyAssignment } from "../db-schemas";
import { UpdateLeavePolicyAssignmentSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeavePolicyAssignmentSchema,
});

export const updateLeavePolicyAssignment = Workflow.name("hr.leave.update-leave-policy-assignment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeavePolicyAssignmentSchema, patch);

    const [updated] = await ctx.db
      .update(leavePolicyAssignment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leavePolicyAssignment.id, id))
      .returning();

    return updated;
  });
