import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsPublicLink } from "../db-schemas";
import { WithIdSchema } from "./item-utils";

export const getItemPublicLinkById = Workflow.name("dms.public-link.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select()
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return link;
  });
