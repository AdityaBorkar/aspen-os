import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveEncashment } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeaveEncashment = Workflow.name(
  "hr.leave.delete-leave-encashment",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(leaveEncashment)
      .where(eq(leaveEncashment.id, id))
      .returning();

    return deleted;
  });
