import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveShare } from "../../db-schemas";
import { WithIdSchema } from "../utils";

export const fetchShareStep = WorkflowStep.name("fetch-share")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(driveShare)
      .where(eq(driveShare.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Share with id "${input.id}" not found.`);
    }
    return row;
  });
