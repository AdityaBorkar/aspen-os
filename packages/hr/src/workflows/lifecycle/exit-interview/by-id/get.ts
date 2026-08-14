import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { exitInterview } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getExitInterviewById = Workflow.name("hr.lifecycle.get-exit-interview-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(exitInterview)
      .where(eq(exitInterview.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Exit interview with id "${id}" not found.`);
    }

    return result;
  });
