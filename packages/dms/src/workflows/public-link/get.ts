import { dmsPublicLink } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const getPublicLinkById = Workflow.name("dms.public-link.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.id, id))
      .limit(1);
    if (!row) {
      throw new Error(`Public link with id "${id}" not found.`);
    }
    return row;
  });
