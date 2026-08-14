import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveAllocation } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeaveAllocation = Workflow.name("hr.leave.delete-leave-allocation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(leaveAllocation)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(leaveAllocation.id, id))
      .returning();

    return updated;
  });
