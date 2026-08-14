import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { shiftSchedule } from "../../../db-schemas";
import { CreateShiftScheduleSchema } from "../../../types";
import { fetchShiftTypeById } from "../../utils";

const InputSchema = object({
  input: CreateShiftScheduleSchema,
});

export const createShiftSchedule = Workflow.name("hr.shift.create-shift-schedule")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShiftScheduleSchema, input);

    // Verify shift type exists
    await fetchShiftTypeById(ctx.db, parsed.shiftType);

    const [result] = await ctx.db
      .insert(shiftSchedule)
      .values({
        friday: parsed.friday ?? false,
        monday: parsed.monday ?? false,
        name: parsed.name,
        saturday: parsed.saturday ?? false,
        shiftType: parsed.shiftType,
        sunday: parsed.sunday ?? false,
        thursday: parsed.thursday ?? false,
        tuesday: parsed.tuesday ?? false,
        wednesday: parsed.wednesday ?? false,
      })
      .returning();

    return result;
  });
