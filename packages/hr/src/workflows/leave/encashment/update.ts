import { leaveEncashment } from "#/db-schemas";
import { UpdateLeaveEncashmentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeaveEncashmentSchema,
});

export const updateLeaveEncashment = Workflow.name("hr.leave.update-leave-encashment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeaveEncashmentSchema, patch);

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  });
