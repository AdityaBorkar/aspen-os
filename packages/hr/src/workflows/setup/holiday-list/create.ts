import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { holidayList } from "../../../db-schemas";
import { CreateHolidayListSchema } from "../../../types";

const InputSchema = object({
  input: CreateHolidayListSchema,
});

export const createHolidayList = Workflow.name("hr.setup.create-holiday-list")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateHolidayListSchema, input);

    const [result] = await ctx.db
      .insert(holidayList)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
        weeklyOffDays: parsed.weeklyOffDays ?? [],
        year: parsed.year,
      })
      .returning();

    return result;
  });
