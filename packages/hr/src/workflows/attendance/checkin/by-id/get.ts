import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeCheckin } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getCheckinById = Workflow.name("hr.attendance.get-checkin-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeCheckin)
      .where(eq(employeeCheckin.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Checkin with id "${id}" not found.`);
    }

    return result;
  });
