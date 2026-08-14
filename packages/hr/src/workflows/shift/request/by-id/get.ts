import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftRequest } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getShiftRequestById = Workflow.name("hr.shift.get-shift-request-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(shiftRequest)
      .where(eq(shiftRequest.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift request with id "${id}" not found.`);
    }

    return result;
  });
