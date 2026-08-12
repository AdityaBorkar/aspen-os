import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { drivePublicLink } from "../db-schemas";
import { WithIdSchema } from "./utils";

export const getPublicLinkById = Workflow.name("drive.public-link.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select()
      .from(drivePublicLink)
      .where(eq(drivePublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return link;
  });
