import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { drivePublicLink } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { WithIdSchema } from "./utils";

export const revokePublicLink = Workflow.name("drive.public-link.revoke")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select({
        id: drivePublicLink.id,
        itemId: drivePublicLink.itemId,
      })
      .from(drivePublicLink)
      .where(eq(drivePublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    await ctx.db.update(drivePublicLink).set({ isActive: false }).where(eq(drivePublicLink.id, id));

    await ctx.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_REVOKED, {
      itemId: link.itemId,
      publicLinkId: id,
    });
  });
