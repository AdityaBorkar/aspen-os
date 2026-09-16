import { leaveEncashment } from "#/db-schemas";
import { assertUpdated, fetchLeaveEncashment, requireStatus } from "#/workflows/fetch";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const markLeaveEncashmentPaid = Workflow.name("hr.leave.encashment.mark-paid")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const encashment = await fetchLeaveEncashment(ctx.db, id);
    requireStatus(encashment, "approved", `Leave encashment "${id}"`);

    const [updated] = await ctx.db
      .update(leaveEncashment)
      .set({
        status: "paid",
        updated_at: new Date(),
      })
      .where(eq(leaveEncashment.id, id))
      .returning();

    return assertUpdated(updated, `Leave encashment "${id}"`);
  });
