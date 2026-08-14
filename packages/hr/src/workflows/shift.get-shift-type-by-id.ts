import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftType } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getShiftTypeById = Workflow.name("hr.shift.get-shift-type-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db.select().from(shiftType).where(eq(shiftType.id, id)).limit(1);

    if (!result) {
      throw new Error(`Shift type with id "${id}" not found.`);
    }

    return result;
  });
