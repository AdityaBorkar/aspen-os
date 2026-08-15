import { dmsShare } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchShareStep = WorkflowStep.name("dms-fetch-share")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db.select().from(dmsShare).where(eq(dmsShare.id, input.id)).limit(1);
    if (!row) {
      throw new Error(`Share with id "${input.id}" not found.`);
    }
    return row;
  });
