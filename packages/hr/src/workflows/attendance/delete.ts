import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { attendance } from "../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteRecord = Workflow.name("hr.attendance.delete")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db.delete(attendance).where(eq(attendance.id, id)).returning();

    return deleted;
  });
