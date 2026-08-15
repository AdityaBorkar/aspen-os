import { holidayList } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getHolidayListById = Workflow.name("hr.setup.get-holiday-list-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db.select().from(holidayList).where(eq(holidayList.id, id)).limit(1);

    if (!result) {
      throw new Error(`Holiday list with id "${id}" not found.`);
    }

    return result;
  });
