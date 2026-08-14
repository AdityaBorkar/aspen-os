import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { leaveAllocation } from "../db-schemas";
import { UpdateLeaveAllocationSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeaveAllocationSchema,
});

export const updateLeaveAllocation = Workflow.name("hr.leave.update-leave-allocation")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeaveAllocationSchema, patch);

    const [updated] = await ctx.db
      .update(leaveAllocation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveAllocation.id, id))
      .returning();

    return updated;
  });
