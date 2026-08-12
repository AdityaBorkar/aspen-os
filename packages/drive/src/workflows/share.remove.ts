import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveShare } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { WithIdSchema } from "./utils";

export const removeShare = Workflow.name("drive.share.remove")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db
      .select({ id: driveShare.id, itemId: driveShare.itemId })
      .from(driveShare)
      .where(eq(driveShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    await ctx.db.delete(driveShare).where(eq(driveShare.id, id));

    await ctx.pubsub.publish(DRIVE_EVENTS.UNSHARED, {
      itemId: share.itemId,
      shareId: id,
    });
  });
