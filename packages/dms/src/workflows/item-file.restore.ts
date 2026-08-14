import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFile, dmsFolder } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { WithFileIdSchema } from "./item-utils";
import { fetchItemFileStep } from "./steps/fetch-item-file";

export const restoreItemFile = Workflow.name("dms.file.restore")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchItemFileStep, { id });

    if (file.folderId) {
      const [folder] = await ctx.db
        .select({
          id: dmsFolder.id,
          isTrashed: dmsFolder.isTrashed,
        })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, file.folderId))
        .limit(1);

      if (!folder || folder.isTrashed) {
        await ctx.db
          .update(dmsFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(dmsFile.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        isTrashed: false,
        trashedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(ITEM_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  });
