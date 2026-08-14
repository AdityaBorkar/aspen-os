import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { holiday } from "../../../../db-schemas";

const InputSchema = object({
  holidayListId: pipe(string(), minLength(1, "holidayListId is required")),
});

export const listHolidaysByList = Workflow.name("hr.setup.list-holidays-by-list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { holidayListId } = input;

    return ctx.db.select().from(holiday).where(eq(holiday.holidayListId, holidayListId));
  });
