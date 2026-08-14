import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsPublicLink } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { WithIdSchema } from "./item-utils";

export const revokeItemPublicLink = Workflow.name("dms.public-link.revoke")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select({
        id: dmsPublicLink.id,
        itemId: dmsPublicLink.itemId,
      })
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    await ctx.db
      .update(dmsPublicLink)
      .set({ isActive: false })
      .where(eq(dmsPublicLink.id, id));

    await ctx.pubsub.publish(ITEM_EVENTS.PUBLIC_LINK_REVOKED, {
      itemId: link.itemId,
      publicLinkId: id,
    });
  });
