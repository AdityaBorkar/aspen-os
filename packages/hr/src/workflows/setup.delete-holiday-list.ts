import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { holidayList } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteHolidayList = Workflow.name("hr.setup.delete-holiday-list")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [updated] = await ctx.db
      .update(holidayList)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(holidayList.id, id))
      .returning();

    return updated;
  });
