import { holidayList } from "#/db-schemas";
import { CreateHolidayListSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateHolidayListSchema,
});

export const createHolidayList = Workflow.name("hr.config.holiday-list.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(holidayList)
      .values({
        description: parsed.description ?? null,
        name: parsed.name,
        weekly_off_days: parsed.weeklyOffDays ?? [],
        year: parsed.year,
      })
      .returning();

    return result;
  });
