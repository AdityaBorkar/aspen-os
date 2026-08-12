import { getContext } from "@aspen-os/platform/server";
import { and, desc, eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { object, string } from "valibot";

import { driveFile, driveFileVersion, driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { getDriveConfig } from "../runtime";
import { remove as removeStorage } from "../services/storage-bridge";

type DB = NodePgDatabase<Record<string, never>>;

export const FileIdSchema = string();
export const WithFileIdSchema = object({ id: FileIdSchema });
export const WithIdSchema = object({ id: string() });

export async function pruneOldVersions(
  db: DB,
  fileId: string,
  maxVersions: number,
): Promise<void> {
  const versions = await db
    .select({
      id: driveFileVersion.id,
      storageKey: driveFileVersion.storageKey,
      version: driveFileVersion.version,
    })
    .from(driveFileVersion)
    .where(eq(driveFileVersion.fileId, fileId))
    .orderBy(desc(driveFileVersion.version));

  if (versions.length <= maxVersions) return;

  const toPrune = versions.slice(maxVersions);

  for (const v of toPrune) {
    await removeStorage({ key: v.storageKey });
    await db.delete(driveFileVersion).where(eq(driveFileVersion.id, v.id));
  }
}

/** Runs the auto-purge job using getContext() (invoked from the cron schedule). */
export async function purgeExpiredInternal(): Promise<void> {
  const { db, pubsub } = getContext();
  const config = getDriveConfig();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.trashRetentionDays);

  const expiredFiles = await db
    .select({ id: driveFile.id, storageKey: driveFile.storageKey })
    .from(driveFile)
    .where(
      and(eq(driveFile.isTrashed, true), lt(driveFile.trashedAt, cutoffDate)),
    );

  for (const file of expiredFiles) {
    await removeStorage({ key: file.storageKey });
    await db.delete(driveFile).where(eq(driveFile.id, file.id));
    await pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: file.id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  }

  const expiredFolders = await db
    .select({ id: driveFolder.id })
    .from(driveFolder)
    .where(
      and(
        eq(driveFolder.isTrashed, true),
        lt(driveFolder.trashedAt, cutoffDate),
      ),
    );

  for (const folder of expiredFolders) {
    await db.delete(driveFolder).where(eq(driveFolder.id, folder.id));
    await pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: folder.id,
      itemType: "folder",
      storageKey: null,
    });
  }
}
