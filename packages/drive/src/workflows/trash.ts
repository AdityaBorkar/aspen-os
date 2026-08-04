import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import {
  remove as removeStorage,
  type StorageBridgeDeps,
} from "../services/storage-bridge";
import type { EmptyTrashOptions, ListTrashOptions } from "../types";
import { EmptyTrashOptionsSchema, ListTrashOptionsSchema } from "../types";

type DB = NodePgDatabase<Record<string, never>>;

interface TrashConfig {
  trashRetentionDays: number;
}

export interface TrashDeps {
  config: TrashConfig;
  db: DB;
  pubsub: PubSubUnit;
  storageDeps: StorageBridgeDeps;
}

export async function listTrash(
  opts: ListTrashOptions | undefined,
  { db }: TrashDeps,
) {
  const parsed = parse(ListTrashOptionsSchema, opts ?? {});
  const limit = parsed.limit ?? 50;
  const offset = parsed.offset ?? 0;

  const folderConditions = [eq(s.driveFolder.isTrashed, true)];
  const fileConditions = [eq(s.driveFile.isTrashed, true)];

  if (parsed.ownerId) {
    folderConditions.push(eq(s.driveFolder.ownerId, parsed.ownerId));
    fileConditions.push(eq(s.driveFile.ownerId, parsed.ownerId));
  }

  const folders = await db
    .select()
    .from(s.driveFolder)
    .where(and(...folderConditions))
    .limit(limit)
    .offset(offset);

  const files = await db
    .select()
    .from(s.driveFile)
    .where(and(...fileConditions))
    .limit(limit)
    .offset(offset);

  return { files, folders };
}

export async function restoreFromTrash(
  { id, itemType }: { id: string; itemType: "file" | "folder" },
  deps: TrashDeps,
) {
  if (itemType === "folder") {
    return restoreTrashFolder({ id }, deps);
  }
  return restoreTrashFile({ id }, deps);
}

export async function emptyTrash(
  opts: EmptyTrashOptions | undefined,
  { db, pubsub, storageDeps }: TrashDeps,
) {
  const parsed = parse(EmptyTrashOptionsSchema, opts ?? {});

  const folderConditions = [eq(s.driveFolder.isTrashed, true)];
  const fileConditions = [eq(s.driveFile.isTrashed, true)];

  if (parsed.ownerId) {
    folderConditions.push(eq(s.driveFolder.ownerId, parsed.ownerId));
    fileConditions.push(eq(s.driveFile.ownerId, parsed.ownerId));
  }

  const trashedFiles = await db
    .select({
      id: s.driveFile.id,
      storageKey: s.driveFile.storageKey,
    })
    .from(s.driveFile)
    .where(and(...fileConditions));

  for (const file of trashedFiles) {
    await removeStorage({ key: file.storageKey }, storageDeps);
    await db.delete(s.driveFile).where(eq(s.driveFile.id, file.id));

    await pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: file.id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  }

  const trashedFolders = await db
    .select({ id: s.driveFolder.id })
    .from(s.driveFolder)
    .where(and(...folderConditions));

  for (const folder of trashedFolders) {
    await db.delete(s.driveFolder).where(eq(s.driveFolder.id, folder.id));

    await pubsub.publish(DRIVE_EVENTS.PURGED, {
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

export async function purgeExpired(
  _input: Record<string, never>,
  { db, pubsub, storageDeps, config }: TrashDeps,
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.trashRetentionDays);

  const expiredFiles = await db
    .select({
      id: s.driveFile.id,
      storageKey: s.driveFile.storageKey,
    })
    .from(s.driveFile)
    .where(
      and(
        eq(s.driveFile.isTrashed, true),
        lt(s.driveFile.trashedAt, cutoffDate),
      ),
    );

  for (const file of expiredFiles) {
    await removeStorage({ key: file.storageKey }, storageDeps);
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

async function restoreTrashFolder(
  { id }: { id: string },
  { db, pubsub }: TrashDeps,
) {
  const [folder] = await db
    .select()
    .from(s.driveFolder)
    .where(eq(s.driveFolder.id, id))
    .limit(1);

  if (!folder) {
    throw new Error(`Folder with id "${id}" not found.`);
  }
  if (!folder.isTrashed) {
    throw new Error(`Folder "${id}" is not in trash.`);
  }

  if (folder.parentId) {
    const [parent] = await db
      .select({ isTrashed: s.driveFolder.isTrashed })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, folder.parentId))
      .limit(1);

    if (!parent || parent.isTrashed) {
      await db
        .update(s.driveFolder)
        .set({ parentId: null, updatedAt: new Date() })
        .where(eq(s.driveFolder.id, id));
    }
  }

  const [updated] = await db
    .update(s.driveFolder)
    .set({
      isTrashed: false,
      trashedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFolder.id, id))
    .returning();

  await pubsub.publish(DRIVE_EVENTS.RESTORED, {
    itemId: id,
    itemType: "folder",
  });

  return updated;
}

async function restoreTrashFile(
  { id }: { id: string },
  { db, pubsub }: TrashDeps,
) {
  const [file] = await db
    .select()
    .from(s.driveFile)
    .where(eq(s.driveFile.id, id))
    .limit(1);

  if (!file) {
    throw new Error(`File with id "${id}" not found.`);
  }
  if (!file.isTrashed) {
    throw new Error(`File "${id}" is not in trash.`);
  }

  if (file.folderId) {
    const [folder] = await db
      .select({ isTrashed: s.driveFolder.isTrashed })
      .from(s.driveFolder)
      .where(eq(s.driveFolder.id, file.folderId))
      .limit(1);

    if (!folder || folder.isTrashed) {
      await db
        .update(s.driveFile)
        .set({ folderId: null, updatedAt: new Date() })
        .where(eq(s.driveFile.id, id));
    }
  }

  const [updated] = await db
    .update(s.driveFile)
    .set({
      isTrashed: false,
      trashedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(s.driveFile.id, id))
    .returning();

  await pubsub.publish(DRIVE_EVENTS.RESTORED, {
    itemId: id,
    itemType: "file",
  });

  return updated;
}
