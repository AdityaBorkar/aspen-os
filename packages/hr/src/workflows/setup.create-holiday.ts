import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { holiday } from "../db-schemas";
import { CreateHolidaySchema } from "../types";
import { fetchHolidayListById } from "./utils";

const InputSchema = object({
  input: CreateHolidaySchema,
});

export const createHoliday = Workflow.name("hr.setup.create-holiday")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateHolidaySchema, input);

    // Verify holiday list exists
    await fetchHolidayListById(ctx.db, parsed.holidayListId);

    const [result] = await ctx.db
      .insert(holiday)
      .values({
        date: parsed.date,
        description: parsed.description ?? null,
        holidayListId: parsed.holidayListId,
        name: parsed.name,
        type: parsed.type ?? "public",
      })
      .returning();

    return result;
  });
