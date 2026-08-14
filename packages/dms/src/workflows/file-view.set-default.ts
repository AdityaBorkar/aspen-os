import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsFileView } from "../db-schemas";
import { FILE_VIEW_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { unsetDefaultFileView } from "./file-view.utils";

const SetDefaultInputSchema = object({ id: IdSchema });

export const setDefaultFileView = Workflow.name("dms.file-view.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const [view] = await ctx.db
      .select({ id: dmsFileView.id, ownerId: dmsFileView.ownerId })
      .from(dmsFileView)
      .where(eq(dmsFileView.id, id))
      .limit(1);

    if (!view) {
      throw new Error(`File view "${id}" not found.`);
    }

    await ctx.step.run("unset-previous", async () => {
      await unsetDefaultFileView(ctx.db, view.ownerId);
    });

    const [updated] = await ctx.db
      .update(dmsFileView)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(dmsFileView.id, id))
      .returning();

    await ctx.pubsub.publish(FILE_VIEW_EVENTS.UPDATED, { fileViewId: id });

    return updated ?? view;
  });
