import { leaveType } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeaveType = Workflow.name("hr.leave.delete-leave-type")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(leaveType)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(leaveType.id, id))
      .returning();

    return updated;
  });
