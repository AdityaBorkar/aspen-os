import { serviceProvider } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchServiceProviderStep = WorkflowStep.name("fetch-sp")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(serviceProvider)
      .where(eq(serviceProvider.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Service Provider with id "${input.id}" not found.`);
    }

    return result;
  });
