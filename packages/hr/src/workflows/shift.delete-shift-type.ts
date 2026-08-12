import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftType } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteShiftType = Workflow.name("hr.shift.delete-shift-type")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(shiftType)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shiftType.id, id))
      .returning();

    return updated;
  });
