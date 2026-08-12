import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { driveFile, driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { remove as removeStorage } from "../services/storage-bridge";
import type { EmptyTrashOptions } from "../types";
import { EmptyTrashOptionsSchema } from "../types";

const EmptyTrashSchema = EmptyTrashOptionsSchema;

export const emptyTrash = Workflow.name("drive.trash.empty")
  .input(EmptyTrashSchema)
  .handler(async (input, ctx) => {
    const validated = input as EmptyTrashOptions | undefined;

    const folderConditions = [eq(driveFolder.isTrashed, true)];
    const fileConditions = [eq(driveFile.isTrashed, true)];

    if (validated?.ownerId) {
      folderConditions.push(eq(driveFolder.ownerId, validated.ownerId));
      fileConditions.push(eq(driveFile.ownerId, validated.ownerId));
    }

    const trashedFiles = await ctx.db
      .select({ id: driveFile.id, storageKey: driveFile.storageKey })
      .from(driveFile)
      .where(and(...fileConditions));

    for (const file of trashedFiles) {
      await ctx.step.run("remove-storage", async () => {
        await removeStorage({ key: file.storageKey });
      });
      await ctx.db.delete(driveFile).where(eq(driveFile.id, file.id));
      await ctx.pubsub.publish(DRIVE_EVENTS.PURGED, {
        itemId: file.id,
        itemType: "file",
        storageKey: file.storageKey,
      });
    }

    const trashedFolders = await ctx.db
      .select({ id: driveFolder.id })
      .from(driveFolder)
      .where(and(...folderConditions));

    for (const folder of trashedFolders) {
      await ctx.db.delete(driveFolder).where(eq(driveFolder.id, folder.id));
      await ctx.pubsub.publish(DRIVE_EVENTS.PURGED, {
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
