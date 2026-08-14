import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { leavePeriod } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteLeavePeriod = Workflow.name("hr.leave.delete-leave-period")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(leavePeriod)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(leavePeriod.id, id))
      .returning();

    return updated;
  });
