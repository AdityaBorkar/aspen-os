import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { status } from "../../db-schemas/status";
import { IdSchema } from "../../types";

export const fetchStatusStep = WorkflowStep.name("fetch-status")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(status)
      .where(eq(status.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Status with id "${input.id}" not found.`);
    }

    return result;
  });
