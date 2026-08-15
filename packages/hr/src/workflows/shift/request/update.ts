import { shiftRequest } from "#/db-schemas";
import { UpdateShiftRequestSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftRequestSchema,
});

export const updateShiftRequest = Workflow.name("hr.shift.update-shift-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateShiftRequestSchema, patch);

    const [updated] = await ctx.db
      .update(shiftRequest)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftRequest.id, id))
      .returning();

    return updated;
  });
