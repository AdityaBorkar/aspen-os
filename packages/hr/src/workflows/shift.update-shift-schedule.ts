import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { shiftSchedule } from "../db-schemas";
import { UpdateShiftScheduleSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateShiftScheduleSchema,
});

export const updateShiftSchedule = Workflow.name("hr.shift.update-shift-schedule")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateShiftScheduleSchema, patch);

    const [updated] = await ctx.db
      .update(shiftSchedule)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(shiftSchedule.id, id))
      .returning();

    return updated;
  });
