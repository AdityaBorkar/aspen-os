import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveAllocation } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getLeaveAllocationById = Workflow.name("hr.leave.get-leave-allocation-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(leaveAllocation)
      .where(eq(leaveAllocation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Leave allocation with id "${id}" not found.`);
    }

    return result;
  });
