import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveEncashment } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  rejectedBy: pipe(string(), minLength(1, "rejectedBy is required")),
  rejectionReason: pipe(string(), minLength(1, "rejectionReason is required")),
});

export const rejectLeaveEncashment = Workflow.name("hr.leave.reject-leave-encashment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, rejectedBy, rejectionReason } = input;

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason,
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  });
