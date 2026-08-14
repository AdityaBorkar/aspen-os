import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { holiday } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getHolidayById = Workflow.name("hr.setup.get-holiday-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db.select().from(holiday).where(eq(holiday.id, id)).limit(1);

    if (!result) {
      throw new Error(`Holiday with id "${id}" not found.`);
    }

    return result;
  });
