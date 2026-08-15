import { shiftLocation } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteShiftLocation = Workflow.name("hr.shift.delete-shift-location")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(shiftLocation)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(shiftLocation.id, id))
      .returning();

    return updated;
  });
