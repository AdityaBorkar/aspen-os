import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsPublicLink } from "../../db-schemas";
import { WithIdSchema } from "../item-utils";

export const fetchItemPublicLinkStep = WorkflowStep.name("fetch-item-public-link")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.id, input.id))
      .limit(1);
    if (!row) {
      throw new Error(`Public link with id "${input.id}" not found.`);
    }
    return row;
  });
