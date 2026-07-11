import type { PubSubUnit } from "@aspen-os/framework/server";
import { and, eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { driveFile, driveFolder } from "../db-schema";
import { DRIVE_EVENTS } from "../event-map";
import type { StorageBridge } from "../services/storage-bridge";
import type { EmptyTrashOptions, ListTrashOptions } from "../types";
import { EmptyTrashOptionsSchema, ListTrashOptionsSchema } from "../types";

type DB = NodePgDatabase<Record<string, never>>;

interface TrashConfig {
  trashRetentionDays: number;
}

export class TrashWorkflow {
  constructor(
    private db: DB,
    private storageBridge: StorageBridge,
    private pubsub: PubSubUnit,
    private config: TrashConfig,
  ) {}

  async list(opts?: ListTrashOptions) {
    const parsed = parse(ListTrashOptionsSchema, opts ?? {});
    const limit = parsed.limit ?? 50;
    const offset = parsed.offset ?? 0;

    const folderConditions = [eq(driveFolder.isTrashed, true)];
    const fileConditions = [eq(driveFile.isTrashed, true)];

    if (parsed.ownerId) {
      folderConditions.push(eq(driveFolder.ownerId, parsed.ownerId));
      fileConditions.push(eq(driveFile.ownerId, parsed.ownerId));
    }

    const folders = await this.db
      .select()
      .from(driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const files = await this.db
      .select()
      .from(driveFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);

    return { files, folders };
  }

  async restore(id: string, itemType: "file" | "folder") {
    if (itemType === "folder") {
      return this.restoreFolder(id);
    }
    return this.restoreFile(id);
  }

  async emptyTrash(opts?: EmptyTrashOptions) {
    const parsed = parse(EmptyTrashOptionsSchema, opts ?? {});

    const folderConditions = [eq(driveFolder.isTrashed, true)];
    const fileConditions = [eq(driveFile.isTrashed, true)];

    if (parsed.ownerId) {
      folderConditions.push(eq(driveFolder.ownerId, parsed.ownerId));
      fileConditions.push(eq(driveFile.ownerId, parsed.ownerId));
    }

    const trashedFiles = await this.db
      .select({
        id: driveFile.id,
        storageKey: driveFile.storageKey,
      })
      .from(driveFile)
      .where(and(...fileConditions));

    for (const file of trashedFiles) {
      await this.storageBridge.remove(file.storageKey);
      await this.db.delete(driveFile).where(eq(driveFile.id, file.id));

      await this.pubsub.publish(DRIVE_EVENTS.PURGED, {
        itemId: file.id,
        itemType: "file",
        storageKey: file.storageKey,
      });
    }

    const trashedFolders = await this.db
      .select({ id: driveFolder.id })
      .from(driveFolder)
      .where(and(...folderConditions));

    for (const folder of trashedFolders) {
      await this.db.delete(driveFolder).where(eq(driveFolder.id, folder.id));

      await this.pubsub.publish(DRIVE_EVENTS.PURGED, {
        itemId: folder.id,
        itemType: "folder",
        storageKey: null,
      });
    }

    return {
      filesPurged: trashedFiles.length,
      foldersPurged: trashedFolders.length,
    };
  }

  async purgeExpired(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.trashRetentionDays);

    const expiredFiles = await this.db
      .select({
        id: driveFile.id,
        storageKey: driveFile.storageKey,
      })
      .from(driveFile)
      .where(
        and(eq(driveFile.isTrashed, true), lt(driveFile.trashedAt, cutoffDate)),
      );

    for (const file of expiredFiles) {
      await this.storageBridge.remove(file.storageKey);
      await this.db.delete(driveFile).where(eq(driveFile.id, file.id));

      await this.pubsub.publish(DRIVE_EVENTS.PURGED, {
        itemId: file.id,
        itemType: "file",
        storageKey: file.storageKey,
      });
    }

    const expiredFolders = await this.db
      .select({ id: driveFolder.id })
      .from(driveFolder)
      .where(
        and(
          eq(driveFolder.isTrashed, true),
          lt(driveFolder.trashedAt, cutoffDate),
        ),
      );

    for (const folder of expiredFolders) {
      await this.db.delete(driveFolder).where(eq(driveFolder.id, folder.id));

      await this.pubsub.publish(DRIVE_EVENTS.PURGED, {
        itemId: folder.id,
        itemType: "folder",
        storageKey: null,
      });
    }
  }

  private async restoreFolder(id: string) {
    const [folder] = await this.db
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
      const [parent] = await this.db
        .select({ isTrashed: driveFolder.isTrashed })
        .from(driveFolder)
        .where(eq(driveFolder.id, folder.parentId))
        .limit(1);

      if (!parent || parent.isTrashed) {
        await this.db
          .update(driveFolder)
          .set({ parentId: null, updatedAt: new Date() })
          .where(eq(driveFolder.id, id));
      }
    }

    const [updated] = await this.db
      .update(driveFolder)
      .set({
        isTrashed: false,
        trashedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(driveFolder.id, id))
      .returning();

    await this.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  }

  private async restoreFile(id: string) {
    const [file] = await this.db
      .select()
      .from(driveFile)
      .where(eq(driveFile.id, id))
      .limit(1);

    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }
    if (!file.isTrashed) {
      throw new Error(`File "${id}" is not in trash.`);
    }

    if (file.folderId) {
      const [folder] = await this.db
        .select({ isTrashed: driveFolder.isTrashed })
        .from(driveFolder)
        .where(eq(driveFolder.id, file.folderId))
        .limit(1);

      if (!folder || folder.isTrashed) {
        await this.db
          .update(driveFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(driveFile.id, id));
      }
    }

    const [updated] = await this.db
      .update(driveFile)
      .set({
        isTrashed: false,
        trashedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    await this.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  }
}
