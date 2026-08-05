import { getContext, Workflow } from "@aspen-os/platform/server";
import { and, eq, lt } from "drizzle-orm";
import { object, string } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import { getDriveConfig } from "../runtime";
import { remove as removeStorage } from "../services/storage-bridge";
import type { EmptyTrashOptions, ListTrashOptions } from "../types";
import { EmptyTrashOptionsSchema, ListTrashOptionsSchema } from "../types";

const ListTrashSchema = ListTrashOptionsSchema;
const EmptyTrashSchema = EmptyTrashOptionsSchema;
const RestoreSchema = object({ id: string(), itemType: string() });
const PurgeInputSchema = object({});

export const listTrash = Workflow.name("drive.trash.list")
  .input(ListTrashSchema)
  .handler(async (input, ctx) => {
    const validated = input as ListTrashOptions | undefined;
    const limit = validated?.limit ?? 50;
    const offset = validated?.offset ?? 0;

    const folderConditions = [eq(s.driveFolder.isTrashed, true)];
    const fileConditions = [eq(s.driveFile.isTrashed, true)];

    if (validated?.ownerId) {
      folderConditions.push(eq(s.driveFolder.ownerId, validated.ownerId));
      fileConditions.push(eq(s.driveFile.ownerId, validated.ownerId));
    }

    const folders = await ctx.db
      .select()
      .from(s.driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const files = await ctx.db
      .select()
      .from(s.driveFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);

    return { files, folders };
  });

export const restoreFromTrash = Workflow.name("drive.trash.restore")
  .input(RestoreSchema)
  .handler(async ({ id, itemType }, ctx) => {
    if (itemType === "folder") {
      const [folder] = await ctx.db
        .select()
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, id))
        .limit(1);
      if (!folder) throw new Error(`Folder with id "${id}" not found.`);
      if (!folder.isTrashed) throw new Error(`Folder "${id}" is not in trash.`);

      if (folder.parentId) {
        const [parent] = await ctx.db
          .select({ isTrashed: s.driveFolder.isTrashed })
          .from(s.driveFolder)
          .where(eq(s.driveFolder.id, folder.parentId))
          .limit(1);
        if (!parent || parent.isTrashed) {
          await ctx.db
            .update(s.driveFolder)
            .set({ parentId: null, updatedAt: new Date() })
            .where(eq(s.driveFolder.id, id));
        }
      }

      const [updated] = await ctx.db
        .update(s.driveFolder)
        .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
        .where(eq(s.driveFolder.id, id))
        .returning();

      await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
        itemId: id,
        itemType: "folder",
      });
      return updated;
    }

    const [file] = await ctx.db
      .select()
      .from(s.driveFile)
      .where(eq(s.driveFile.id, id))
      .limit(1);
    if (!file) throw new Error(`File with id "${id}" not found.`);
    if (!file.isTrashed) throw new Error(`File "${id}" is not in trash.`);

    if (file.folderId) {
      const [folder] = await ctx.db
        .select({ isTrashed: s.driveFolder.isTrashed })
        .from(s.driveFolder)
        .where(eq(s.driveFolder.id, file.folderId))
        .limit(1);
      if (!folder || folder.isTrashed) {
        await ctx.db
          .update(s.driveFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(s.driveFile.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(s.driveFile)
      .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
      .where(eq(s.driveFile.id, id))
      .returning();

    await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });
    return updated;
  });

export const emptyTrash = Workflow.name("drive.trash.empty")
  .input(EmptyTrashSchema)
  .handler(async (input, ctx) => {
    const validated = input as EmptyTrashOptions | undefined;

    const folderConditions = [eq(s.driveFolder.isTrashed, true)];
    const fileConditions = [eq(s.driveFile.isTrashed, true)];

    if (validated?.ownerId) {
      folderConditions.push(eq(s.driveFolder.ownerId, validated.ownerId));
      fileConditions.push(eq(s.driveFile.ownerId, validated.ownerId));
    }

    const trashedFiles = await ctx.db
      .select({ id: s.driveFile.id, storageKey: s.driveFile.storageKey })
      .from(s.driveFile)
      .where(and(...fileConditions));

    for (const file of trashedFiles) {
      await ctx.step.run("remove-storage", async () => {
        await removeStorage({ key: file.storageKey });
      });
      await ctx.db.delete(s.driveFile).where(eq(s.driveFile.id, file.id));
      await ctx.pubsub.publish(DRIVE_EVENTS.PURGED, {
        itemId: file.id,
        itemType: "file",
        storageKey: file.storageKey,
      });
    }

    const trashedFolders = await ctx.db
      .select({ id: s.driveFolder.id })
      .from(s.driveFolder)
      .where(and(...folderConditions));

    for (const folder of trashedFolders) {
      await ctx.db.delete(s.driveFolder).where(eq(s.driveFolder.id, folder.id));
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

export const purgeExpired = Workflow.name("drive.trash.purge-expired")
  .input(PurgeInputSchema)
  .handler(async () => {
    await purgeExpiredInternal();
  });

/** Runs the auto-purge job using getContext() (invoked from the cron schedule). */
export async function purgeExpiredInternal(): Promise<void> {
  const { db, pubsub } = getContext();
  const config = getDriveConfig();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.trashRetentionDays);

  const expiredFiles = await db
    .select({ id: s.driveFile.id, storageKey: s.driveFile.storageKey })
    .from(s.driveFile)
    .where(
      and(
        eq(s.driveFile.isTrashed, true),
        lt(s.driveFile.trashedAt, cutoffDate),
      ),
    );

  for (const file of expiredFiles) {
    await removeStorage({ key: file.storageKey });
    await db.delete(s.driveFile).where(eq(s.driveFile.id, file.id));
    await pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: file.id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  }

  const expiredFolders = await db
    .select({ id: s.driveFolder.id })
    .from(s.driveFolder)
    .where(
      and(
        eq(s.driveFolder.isTrashed, true),
        lt(s.driveFolder.trashedAt, cutoffDate),
      ),
    );

  for (const folder of expiredFolders) {
    await db.delete(s.driveFolder).where(eq(s.driveFolder.id, folder.id));
    await pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: folder.id,
      itemType: "folder",
      storageKey: null,
    });
  }
}

export const trash = {
  emptyTrash,
  list: listTrash,
  purgeExpired,
  restore: restoreFromTrash,
};
