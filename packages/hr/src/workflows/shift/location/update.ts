import { shiftLocation } from "#/db-schemas";
import { UpdateShiftLocationSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftLocationSchema,
});

export const updateShiftLocation = Workflow.name("hr.shift.update-shift-location")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const [updated] = await ctx.db
      .update(shiftLocation)
      .set({ ...parsed, updated_at: new Date() })
      .where(eq(shiftLocation.id, id))
      .returning();

    return updated;
  });
