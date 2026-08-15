import { holiday } from "#/db-schemas";
import { UpdateHolidaySchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateHolidaySchema,
});

export const updateHoliday = Workflow.name("hr.setup.update-holiday")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateHolidaySchema, patch);

    const [updated] = await ctx.db
      .update(holiday)
      .set(parsed)
      .where(eq(holiday.id, id))
      .returning();

    return updated;
  });
