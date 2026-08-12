import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { shiftLocation } from "../db-schemas";
import { UpdateShiftLocationSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftLocationSchema,
});

export const updateShiftLocation = Workflow.name(
  "hr.shift.update-shift-location",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateShiftLocationSchema, patch);

    const [updated] = await ctx.db
      .update(shiftLocation)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftLocation.id, id))
      .returning();

    return updated;
  });
