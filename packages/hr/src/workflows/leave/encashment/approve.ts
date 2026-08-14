import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveEncashment } from "../../../db-schemas";

const InputSchema = object({
  approvedBy: pipe(string(), minLength(1, "approvedBy is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const approveLeaveEncashment = Workflow.name("hr.leave.approve-leave-encashment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, approvedBy } = input;

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({
        approvedAt: new Date(),
        approvedBy,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  });
