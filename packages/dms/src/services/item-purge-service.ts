import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { dmsFile, dmsFolder } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { SCHEDULED_JOBS } from "../utils/constants";
import { remove as removeStorage } from "./item-storage-bridge";

export interface ItemPurgeDeps {
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

export const ITEM_AUTO_PURGE_CRON = "0 3 * * *";

export async function registerItemPurgeSchedule(pubsub: PubSubUnit): Promise<string> {
  await pubsub.schedule({
    cron: ITEM_AUTO_PURGE_CRON,
    data: {},
    options: { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
    topic: SCHEDULED_JOBS.ITEM_AUTO_PURGE,
  });
  return SCHEDULED_JOBS.ITEM_AUTO_PURGE;
}

export async function unregisterItemPurgeSchedule(
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

export async function registerItemPurgeHandler(topic: string, deps: ItemPurgeDeps): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    await purgeExpiredItemsInternal(deps);
  });
}

/**
 * Permanently deletes trashed files and folders past the retention window.
 * Trashed files are removed from storage; folders are purged row-only.
 */
export async function purgeExpiredItemsInternal(deps: ItemPurgeDeps): Promise<number> {
  const config = getDmsConfig();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.trashRetentionDays);

  const expiredFiles = await deps.db
    .select({ id: dmsFile.id, storageKey: dmsFile.storageKey })
    .from(dmsFile)
    .where(and(eq(dmsFile.isTrashed, true), lt(dmsFile.trashedAt, cutoffDate)));

  await Promise.all(
    expiredFiles.map(async (file) => {
      await removeStorage({ key: file.storageKey });
      await deps.db.delete(dmsFile).where(eq(dmsFile.id, file.id));
      await deps.pubsub.publish(ITEM_EVENTS.PURGED, {
        itemId: file.id,
        itemType: "file",
        storageKey: file.storageKey,
      });
    }),
  );

  const expiredFolders = await deps.db
    .select({ id: dmsFolder.id })
    .from(dmsFolder)
    .where(and(eq(dmsFolder.isTrashed, true), lt(dmsFolder.trashedAt, cutoffDate)));

  await Promise.all(
    expiredFolders.map(async (folder) => {
      await deps.db.delete(dmsFolder).where(eq(dmsFolder.id, folder.id));
      await deps.pubsub.publish(ITEM_EVENTS.PURGED, {
        itemId: folder.id,
        itemType: "folder",
        storageKey: null,
      });
    }),
  );

  return expiredFiles.length + expiredFolders.length;
}
