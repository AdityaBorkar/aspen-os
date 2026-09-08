import { fullAndFinalStatement } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteFullAndFinal = Workflow.name("hr.lifecycle.delete-full-and-final")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(fullAndFinalStatement)
      .where(eq(fullAndFinalStatement.id, id))
      .returning();

    return deleted;
  });
