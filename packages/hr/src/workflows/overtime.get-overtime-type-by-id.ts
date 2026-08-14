import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { overtimeType } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getOvertimeTypeById = Workflow.name("hr.overtime.get-overtime-type-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(overtimeType)
      .where(eq(overtimeType.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Overtime type with id "${id}" not found.`);
    }

    return result;
  });
