import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsPublicLink } from "../../db-schemas";
import { PUBLIC_LINK_EVENTS } from "../../pubsub";
import { WithIdSchema } from "../../types";

export const revokePublicLink = Workflow.name("dms.public-link.revoke")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select({
        entityId: dmsPublicLink.entityId,
        entityType: dmsPublicLink.entityType,
        id: dmsPublicLink.id,
      })
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    await ctx.db.update(dmsPublicLink).set({ isActive: false }).where(eq(dmsPublicLink.id, id));

    await ctx.pubsub.publish(PUBLIC_LINK_EVENTS.REVOKED, {
      entityId: link.entityId,
      entityType: link.entityType,
      publicLinkId: id,
    });
  });
