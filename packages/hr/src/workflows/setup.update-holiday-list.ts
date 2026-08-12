import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { holidayList } from "../db-schemas";
import { UpdateHolidayListSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateHolidayListSchema,
});

export const updateHolidayList = Workflow.name("hr.setup.update-holiday-list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateHolidayListSchema, patch);

    const [updated] = await ctx.db
      .update(holidayList)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(holidayList.id, id))
      .returning();

    return updated;
  });
