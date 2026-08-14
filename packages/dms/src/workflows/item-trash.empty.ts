import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { dmsFile, dmsFolder } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { remove as removeStorage } from "../services/item-storage-bridge";
import type { EmptyTrashOptions } from "../types";
import { EmptyTrashOptionsSchema } from "../types";

const EmptyTrashSchema = EmptyTrashOptionsSchema;

export const emptyItemTrash = Workflow.name("dms.trash.empty")
  .input(EmptyTrashSchema)
  .handler(async (input, ctx) => {
    const validated = input as EmptyTrashOptions | undefined;

    const folderConditions = [eq(dmsFolder.isTrashed, true)];
    const fileConditions = [eq(dmsFile.isTrashed, true)];

    if (validated?.ownerId) {
      folderConditions.push(eq(dmsFolder.ownerId, validated.ownerId));
      fileConditions.push(eq(dmsFile.ownerId, validated.ownerId));
    }

    const trashedFiles = await ctx.db
      .select({ id: dmsFile.id, storageKey: dmsFile.storageKey })
      .from(dmsFile)
      .where(and(...fileConditions));

    for (const file of trashedFiles) {
      await ctx.step.run("remove-storage", async () => {
        await removeStorage({ key: file.storageKey });
      });
      await ctx.db.delete(dmsFile).where(eq(dmsFile.id, file.id));
      await ctx.pubsub.publish(ITEM_EVENTS.PURGED, {
        itemId: file.id,
        itemType: "file",
        storageKey: file.storageKey,
      });
    }

    const trashedFolders = await ctx.db
      .select({ id: dmsFolder.id })
      .from(dmsFolder)
      .where(and(...folderConditions));

    for (const folder of trashedFolders) {
      await ctx.db.delete(dmsFolder).where(eq(dmsFolder.id, folder.id));
      await ctx.pubsub.publish(ITEM_EVENTS.PURGED, {
        itemId: folder.id,
        itemType: "folder",
        storageKey: null,
      });
    }

    return {
      filesPurged: trashedFiles.length,
      foldersPurged: trashedFolders.length,
    };
  });
