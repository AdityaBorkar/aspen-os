import { masterEntity } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchEntityStep = WorkflowStep.name("masters-fetch-entity")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(masterEntity)
      .where(eq(masterEntity.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Entity with id "${input.id}" not found.`);
    }

    return result;
  });
