import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsItemShare } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { WithIdSchema } from "./item-utils";

export const removeItemShare = Workflow.name("dms.item-share.remove")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db
      .select({ id: dmsItemShare.id, itemId: dmsItemShare.itemId })
      .from(dmsItemShare)
      .where(eq(dmsItemShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    await ctx.db.delete(dmsItemShare).where(eq(dmsItemShare.id, id));

    await ctx.pubsub.publish(ITEM_EVENTS.UNSHARED, {
      itemId: share.itemId,
      shareId: id,
    });
  });
