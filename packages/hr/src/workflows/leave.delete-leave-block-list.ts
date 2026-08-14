import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveBlockList } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeaveBlockList = Workflow.name("hr.leave.delete-leave-block-list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(leaveBlockList)
      .where(eq(leaveBlockList.id, id))
      .returning();

    return deleted;
  });
