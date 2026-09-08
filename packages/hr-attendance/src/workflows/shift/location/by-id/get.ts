import { shiftLocation } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getShiftLocationById = Workflow.name("hr.shift.get-shift-location-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(shiftLocation)
      .where(eq(shiftLocation.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift location with id "${id}" not found.`);
    }

    return result;
  });
