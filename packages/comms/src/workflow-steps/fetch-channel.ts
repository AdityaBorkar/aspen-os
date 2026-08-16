import { commsChannel } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchChannelStep = WorkflowStep.name("comms-fetch-channel")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(commsChannel)
      .where(eq(commsChannel.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Channel with id "${input.id}" not found.`);
    }
    return row;
  });
