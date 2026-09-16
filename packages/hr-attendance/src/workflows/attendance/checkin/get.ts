import { employeeCheckin } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getCheckin = Workflow.name("hr.attendance.checkin.get")
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
