import { connection } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchConnectionStep = WorkflowStep.name("fetch-connection")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(connection)
      .where(eq(connection.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Connection with id "${input.id}" not found.`);
    }

    return result;
  });
