import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  dmsClass,
  dmsEntityLabel,
  dmsFile,
  dmsFileVersion,
  dmsFolder,
  dmsLegalHold,
  dmsPin,
  dmsPublicLink,
  dmsShare,
} from "../db-schemas";
import { FILE_EVENTS, FOLDER_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { SCHEDULED_JOBS, SETTING_KEYS } from "../utils/constants";
import { getSetting } from "./settings-service";
import { remove as removeStorage } from "./storage-bridge";

export interface PurgeDeps {
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

export const AUTO_PURGE_CRON = "30 3 * * *";

export async function registerPurgeSchedule(pubsub: PubSubUnit): Promise<string> {
  await pubsub.schedule({
    cron: AUTO_PURGE_CRON,
    data: {},
    options: { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    topic: SCHEDULED_JOBS.AUTO_PURGE,
  });
  return SCHEDULED_JOBS.AUTO_PURGE;
}

export async function unregisterPurgeSchedule(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) {
    return;
  }
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // Best-effort
  }
}

export async function registerPurgeHandler(topic: string, deps: PurgeDeps): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    await runAutoPurge(deps);
  });
}

async function resolveRetentionDays(db: NodePgDatabase, classId: string | null): Promise<number> {
  if (classId) {
    const [cls] = await db
      .select({ retentionDays: dmsClass.retentionDays })
      .from(dmsClass)
      .where(eq(dmsClass.id, classId))
      .limit(1);
    if (cls?.retentionDays) {
      return cls.retentionDays;
    }
  }
  const val = (await getSetting(db, SETTING_KEYS.DEFAULT_RETENTION_DAYS)) as number | null;
  return val ?? 180;
}

export async function isFileHeld(db: NodePgDatabase, fileId: string): Promise<boolean> {
  const [hold] = await db
    .select({ id: dmsLegalHold.id })
    .from(dmsLegalHold)
    .where(and(eq(dmsLegalHold.fileId, fileId), isNull(dmsLegalHold.releasedAt)))
    .limit(1);
  return Boolean(hold);
}

/**
 * Permanently deletes a file: removes the current and every version object and
 * cascades version rows, labels, shares, public links, pins, and legal holds.
 * Returns an array of storage keys that were freed.
 */
export async function deleteFilePermanently(db: NodePgDatabase, fileId: string): Promise<string[]> {
  const [current] = await db
    .select({ storageKey: dmsFile.storageKey })
    .from(dmsFile)
    .where(eq(dmsFile.id, fileId))
    .limit(1);

  const versionKeys = await db
    .select({ storageKey: dmsFileVersion.storageKey })
    .from(dmsFileVersion)
    .where(eq(dmsFileVersion.fileId, fileId));

  const keys = [current?.storageKey, ...versionKeys.map((version) => version.storageKey)].filter(
    (key): key is string => Boolean(key),
  );
  await Promise.all(
    keys.map(async (key) => {
      try {
        await removeStorage({ key });
      } catch {
        // Best-effort — object may already be gone
      }
    }),
  );

  await db
    .delete(dmsEntityLabel)
    .where(and(eq(dmsEntityLabel.entityType, "file"), eq(dmsEntityLabel.entityId, fileId)));
  await db
    .delete(dmsShare)
    .where(and(eq(dmsShare.entityType, "file"), eq(dmsShare.entityId, fileId)));
  await db
    .delete(dmsPublicLink)
    .where(and(eq(dmsPublicLink.entityType, "file"), eq(dmsPublicLink.entityId, fileId)));
  await db.delete(dmsPin).where(eq(dmsPin.itemId, fileId));
  await db.delete(dmsFileVersion).where(eq(dmsFileVersion.fileId, fileId));
  await db.delete(dmsLegalHold).where(eq(dmsLegalHold.fileId, fileId));
  await db.delete(dmsFile).where(eq(dmsFile.id, fileId));

  return keys;
}

/**
 * Permanently deletes a folder and its entire subtree: every descendant
 * folder row and every descendant file (storage + rows). Files under an
 * active legal hold are skipped and left in place.
 */
export async function deleteFolderPermanently(
  db: NodePgDatabase,
  folderId: string,
): Promise<{ folders: string[]; files: string[] }> {
  const [folder] = await db
    .select({ path: dmsFolder.path })
    .from(dmsFolder)
    .where(eq(dmsFolder.id, folderId))
    .limit(1);

  if (!folder) {
    return { files: [], folders: [] };
  }

  const prefix = `${folder.path}/%`;
  const descendantFolderRows = await db
    .select({ id: dmsFolder.id })
    .from(dmsFolder)
    .where(sql`${dmsFolder.path} like ${prefix}`);
  const allFolderIds = [folderId, ...descendantFolderRows.map((row) => row.id)];

  const descendantFiles = await db
    .select({ id: dmsFile.id })
    .from(dmsFile)
    .where(sql`${dmsFile.path} like ${prefix}`);

  const filesPurged: string[] = [];
  // oxlint-disable eslint/no-await-in-loop
  for (const file of descendantFiles) {
    if (await isFileHeld(db, file.id)) {
      continue;
    }
    await deleteFilePermanently(db, file.id);
    filesPurged.push(file.id);
  }
  // oxlint-enable eslint/no-await-in-loop

  await db.delete(dmsFolder).where(inArray(dmsFolder.id, allFolderIds));

  return { files: filesPurged, folders: allFolderIds };
}

/**
 * Retention-based auto-purge: trashed/expired files past their resolved
 * retention window (class override, else settings default) and trashed
 * folders past the trash retention window are purged. Files under an active
 * legal hold are always skipped.
 */
export async function runAutoPurge(deps: PurgeDeps): Promise<number> {
  const files = await deps.db
    .select({
      classId: dmsFile.classId,
      deletedAt: dmsFile.deletedAt,
      expiredAt: dmsFile.expiredAt,
      id: dmsFile.id,
      status: dmsFile.status,
    })
    .from(dmsFile)
    .where(or(eq(dmsFile.status, "trashed"), eq(dmsFile.status, "expired")));

  const results = await Promise.all(
    files.map(async (file) => {
      if (await isFileHeld(deps.db, file.id)) {
        return false;
      }

      const retentionDays = await resolveRetentionDays(deps.db, file.classId);
      const anchor = file.deletedAt ?? file.expiredAt;
      if (!anchor) {
        return false;
      }

      const cutoff = new Date(anchor.getTime() + retentionDays * 24 * 60 * 60 * 1000);
      if (cutoff > new Date()) {
        return false;
      }

      const keys = await deleteFilePermanently(deps.db, file.id);

      await deps.audit.write({
        action: "purged",
        crudAction: "delete",
        entityId: file.id,
        entityType: "dms:file",
        metadata: { storageKey: keys[0] ?? null },
      });

      await deps.pubsub.publish(FILE_EVENTS.PURGED, {
        fileId: file.id,
        storageKey: keys[0] ?? "",
      });

      return true;
    }),
  );

  const config = getDmsConfig();
  const folderCutoff = new Date(Date.now() - config.trashRetentionDays * 24 * 60 * 60 * 1000);
  const folders = await deps.db
    .select({ id: dmsFolder.id })
    .from(dmsFolder)
    .where(
      and(
        eq(dmsFolder.isTrashed, true),
        isNotNull(dmsFolder.trashedAt),
        lt(dmsFolder.trashedAt, folderCutoff),
      ),
    );

  let folderCount = 0;
  // oxlint-disable eslint/no-await-in-loop
  for (const folder of folders) {
    const result = await deleteFolderPermanently(deps.db, folder.id);
    for (const folderId of result.folders) {
      await deps.pubsub.publish(FOLDER_EVENTS.PURGED, { folderId });
    }
    folderCount += result.folders.length;
  }
  // oxlint-enable eslint/no-await-in-loop

  return results.filter(Boolean).length + folderCount;
}

/**
 * Prunes oldest versions beyond `maxVersions` for a file. Versions under an
 * active legal hold are never pruned.
 */
export async function pruneVersions(
  db: NodePgDatabase,
  fileId: string,
  maxVersions: number,
): Promise<string[]> {
  const versions = await db
    .select({
      id: dmsFileVersion.id,
      storageKey: dmsFileVersion.storageKey,
      version: dmsFileVersion.version,
    })
    .from(dmsFileVersion)
    .where(eq(dmsFileVersion.fileId, fileId))
    .orderBy(desc(dmsFileVersion.version));

  if (versions.length <= maxVersions) {
    return [];
  }

  const held = await isFileHeld(db, fileId);
  if (held) {
    return [];
  }

  const toPrune = versions.slice(maxVersions);
  const ids = toPrune.map((version) => version.id);
  await Promise.all(
    toPrune.map(async (version) => {
      try {
        await removeStorage({ key: version.storageKey });
      } catch {
        // Best-effort
      }
    }),
  );
  await db.delete(dmsFileVersion).where(inArray(dmsFileVersion.id, ids));
  return toPrune.map((version) => version.storageKey);
}
