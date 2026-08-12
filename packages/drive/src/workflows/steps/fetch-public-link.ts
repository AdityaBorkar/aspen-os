import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { drivePublicLink } from "../../db-schemas";
import { WithIdSchema } from "../utils";

export const fetchPublicLinkStep = WorkflowStep.name("fetch-public-link")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(drivePublicLink)
      .where(eq(drivePublicLink.id, input.id))
      .limit(1);
    if (!row) throw new Error(`Public link with id "${input.id}" not found.`);
    return row;
  });
