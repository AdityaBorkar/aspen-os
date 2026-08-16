import { commsTemplate } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchTemplateStep = WorkflowStep.name("comms-fetch-template")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(commsTemplate)
      .where(eq(commsTemplate.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Template with id "${input.id}" not found.`);
    }
    return row;
  });
