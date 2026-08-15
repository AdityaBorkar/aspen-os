import { leaveType } from "#/db-schemas";
import { UpdateLeaveTypeSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeaveTypeSchema,
});

export const updateLeaveType = Workflow.name("hr.leave.update-leave-type")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeaveTypeSchema, patch);

    const [updated] = await ctx.db
      .update(leaveType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveType.id, id))
      .returning();

    return updated;
  });
