import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { shiftType } from "../db-schemas";
import { UpdateShiftTypeSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftTypeSchema,
});

export const updateShiftType = Workflow.name("hr.shift.update-shift-type")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateShiftTypeSchema, patch);

    const [updated] = await ctx.db
      .update(shiftType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftType.id, id))
      .returning();

    return updated;
  });
