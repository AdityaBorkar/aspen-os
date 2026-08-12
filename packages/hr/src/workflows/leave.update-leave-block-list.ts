import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { leaveBlockList } from "../db-schemas";
import { UpdateLeaveBlockListSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeaveBlockListSchema,
});

export const updateLeaveBlockList = Workflow.name(
  "hr.leave.update-leave-block-list",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeaveBlockListSchema, patch);

    const [updated] = await ctx.db
      .update(leaveBlockList)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveBlockList.id, id))
      .returning();

    return updated;
  });
