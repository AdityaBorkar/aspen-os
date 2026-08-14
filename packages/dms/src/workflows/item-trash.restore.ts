import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsFile, dmsFolder } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";

const RestoreSchema = object({ id: string(), itemType: string() });

export const restoreItemFromTrash = Workflow.name("dms.trash.restore")
  .input(RestoreSchema)
  .handler(async ({ id, itemType }, ctx) => {
    if (itemType === "folder") {
      const [folder] = await ctx.db.select().from(dmsFolder).where(eq(dmsFolder.id, id)).limit(1);
      if (!folder) {
        throw new Error(`Folder with id "${id}" not found.`);
      }
      if (!folder.isTrashed) {
        throw new Error(`Folder "${id}" is not in trash.`);
      }

      if (folder.parentId) {
        const [parent] = await ctx.db
          .select({ isTrashed: dmsFolder.isTrashed })
          .from(dmsFolder)
          .where(eq(dmsFolder.id, folder.parentId))
          .limit(1);
        if (!parent || parent.isTrashed) {
          await ctx.db
            .update(dmsFolder)
            .set({ parentId: null, updatedAt: new Date() })
            .where(eq(dmsFolder.id, id));
        }
      }

      const [updated] = await ctx.db
        .update(dmsFolder)
        .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
        .where(eq(dmsFolder.id, id))
        .returning();

      await ctx.pubsub.publish(ITEM_EVENTS.RESTORED, {
        itemId: id,
        itemType: "folder",
      });
      return updated;
    }

    const [file] = await ctx.db.select().from(dmsFile).where(eq(dmsFile.id, id)).limit(1);
    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }
    if (!file.isTrashed) {
      throw new Error(`File "${id}" is not in trash.`);
    }

    if (file.folderId) {
      const [folder] = await ctx.db
        .select({ isTrashed: dmsFolder.isTrashed })
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
      .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
      .where(eq(dmsFile.id, id))
      .returning();

    await ctx.pubsub.publish(ITEM_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });
    return updated;
  });
