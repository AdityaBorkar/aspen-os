import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftAssignment } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deactivateShiftAssignment = Workflow.name("hr.shift.deactivate-shift-assignment")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(shiftAssignment)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(shiftAssignment.id, id))
      .returning();

    return updated;
  });
