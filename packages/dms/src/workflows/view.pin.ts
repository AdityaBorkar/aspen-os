import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsView } from "../db-schemas";
import { VIEW_EVENTS } from "../pubsub";
import { IdSchema } from "../types";

const ViewIdSchema = object({ id: IdSchema });

export const pinView = Workflow.name("dms.view.pin")
  .input(ViewIdSchema)
  .handler(async ({ id }, ctx) => {
    const [updated] = await ctx.db
      .update(dmsView)
      .set({ isPinned: true, updatedAt: new Date() })
      .where(eq(dmsView.id, id))
      .returning();

    if (!updated) throw new Error(`View "${id}" not found.`);

    await ctx.pubsub.publish(VIEW_EVENTS.PINNED, { viewId: id });

    return updated;
  });

export const unpinView = Workflow.name("dms.view.unpin")
  .input(ViewIdSchema)
  .handler(async ({ id }, ctx) => {
    const [updated] = await ctx.db
      .update(dmsView)
      .set({ isPinned: false, updatedAt: new Date() })
      .where(eq(dmsView.id, id))
      .returning();

    if (!updated) throw new Error(`View "${id}" not found.`);

    await ctx.pubsub.publish(VIEW_EVENTS.UNPINNED, { viewId: id });

    return updated;
  });
