import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { shiftSchedule } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getShiftScheduleById = Workflow.name("hr.shift.get-shift-schedule-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(shiftSchedule)
      .where(eq(shiftSchedule.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Shift schedule with id "${id}" not found.`);
    }

    return result;
  });
