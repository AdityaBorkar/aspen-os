import { commsNotification } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchNotificationStep = WorkflowStep.name("comms-fetch-notification")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(commsNotification)
      .where(eq(commsNotification.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Notification with id "${input.id}" not found.`);
    }
    return row;
  });
