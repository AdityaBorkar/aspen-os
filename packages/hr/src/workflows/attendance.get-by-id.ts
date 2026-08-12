import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { attendance } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getById = Workflow.name("hr.attendance.get-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Attendance with id "${id}" not found.`);
    }

    return result;
  });
