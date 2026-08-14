import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leaveEncashment } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const markLeaveEncashmentPaid = Workflow.name("hr.leave.mark-leave-encashment-paid")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return updated;
  });
