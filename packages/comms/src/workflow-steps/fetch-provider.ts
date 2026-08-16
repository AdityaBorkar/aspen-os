import { commsProvider } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchProviderStep = WorkflowStep.name("comms-fetch-provider")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(commsProvider)
      .where(eq(commsProvider.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Provider with id "${input.id}" not found.`);
    }
    return row;
  });
