import { commsMessage } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchMessageStep = WorkflowStep.name("comms-fetch-message")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(commsMessage)
      .where(eq(commsMessage.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Message with id "${input.id}" not found.`);
    }
    return row;
  });
