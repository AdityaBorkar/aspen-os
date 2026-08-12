import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leavePolicyAssignment } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeavePolicyAssignment = Workflow.name(
  "hr.leave.delete-leave-policy-assignment",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(leavePolicyAssignment)
      .where(eq(leavePolicyAssignment.id, id))
      .returning();

    return deleted;
  });
