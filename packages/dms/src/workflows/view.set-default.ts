import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsView } from "../db-schemas";
import { VIEW_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { unsetDefaultView } from "./view.utils";

const SetDefaultInputSchema = object({ id: IdSchema });

export const setDefaultView = Workflow.name("dms.view.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const [view] = await ctx.db
      .select({ id: dmsView.id, ownerId: dmsView.ownerId })
      .from(dmsView)
      .where(eq(dmsView.id, id))
      .limit(1);

    if (!view) throw new Error(`View "${id}" not found.`);

    await ctx.step.run("unset-previous", async () => {
      await unsetDefaultView(ctx.db, view.ownerId);
    });

    const [updated] = await ctx.db
      .update(dmsView)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(dmsView.id, id))
      .returning();

    await ctx.pubsub.publish(VIEW_EVENTS.UPDATED, { viewId: id });

    return updated ?? view;
  });

export const unsetDefaultViewWorkflow = Workflow.name("dms.view.unset-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const [updated] = await ctx.db
      .update(dmsView)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(dmsView.id, id))
      .returning();

    await ctx.pubsub.publish(VIEW_EVENTS.UPDATED, { viewId: id });

    return updated;
  });
