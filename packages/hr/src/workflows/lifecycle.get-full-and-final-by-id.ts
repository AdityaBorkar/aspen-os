import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { fullAndFinalStatement } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getFullAndFinalById = Workflow.name("hr.lifecycle.get-full-and-final-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(fullAndFinalStatement)
      .where(eq(fullAndFinalStatement.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Full and final statement with id "${id}" not found.`);
    }

    return result;
  });
