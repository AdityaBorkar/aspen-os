import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { driveFile, driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";

const RestoreSchema = object({ id: string(), itemType: string() });

export const restoreFromTrash = Workflow.name("drive.trash.restore")
  .input(RestoreSchema)
  .handler(async ({ id, itemType }, ctx) => {
    if (itemType === "folder") {
      const [folder] = await ctx.db
        .select()
        .from(driveFolder)
        .where(eq(driveFolder.id, id))
        .limit(1);
      if (!folder) {
        throw new Error(`Folder with id "${id}" not found.`);
      }
      if (!folder.isTrashed) {
        throw new Error(`Folder "${id}" is not in trash.`);
      }

      if (folder.parentId) {
        const [parent] = await ctx.db
          .select({ isTrashed: driveFolder.isTrashed })
          .from(driveFolder)
          .where(eq(driveFolder.id, folder.parentId))
          .limit(1);
        if (!parent || parent.isTrashed) {
          await ctx.db
            .update(driveFolder)
            .set({ parentId: null, updatedAt: new Date() })
            .where(eq(driveFolder.id, id));
        }
      }

      const [updated] = await ctx.db
        .update(driveFolder)
        .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
        .where(eq(driveFolder.id, id))
        .returning();

      await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
        itemId: id,
        itemType: "folder",
      });
      return updated;
    }

    const [file] = await ctx.db.select().from(driveFile).where(eq(driveFile.id, id)).limit(1);
    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }
    if (!file.isTrashed) {
      throw new Error(`File "${id}" is not in trash.`);
    }

    if (file.folderId) {
      const [folder] = await ctx.db
        .select({ isTrashed: driveFolder.isTrashed })
        .from(driveFolder)
        .where(eq(driveFolder.id, file.folderId))
        .limit(1);
      if (!folder || folder.isTrashed) {
        await ctx.db
          .update(driveFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(driveFile.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(driveFile)
      .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
      .where(eq(driveFile.id, id))
      .returning();

    await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });
    return updated;
  });
