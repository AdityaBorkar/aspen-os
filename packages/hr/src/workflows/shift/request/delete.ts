import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftRequest } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteShiftRequest = Workflow.name("hr.shift.delete-shift-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db.delete(shiftRequest).where(eq(shiftRequest.id, id)).returning();

    return deleted;
  });
