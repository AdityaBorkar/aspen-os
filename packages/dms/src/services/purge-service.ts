import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  dmsDocument,
  dmsDocumentClass,
  dmsDocumentTag,
  dmsDocumentVersion,
  dmsLegalHold,
  dmsPin,
  dmsShare,
} from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { SCHEDULED_JOBS, SETTING_KEYS } from "../utils/constants";
import { getSetting } from "./settings-service";
import { remove as removeStorage } from "./storage-bridge";

export interface PurgeDeps {
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

export const AUTO_PURGE_CRON = "30 3 * * *";

export async function registerPurgeSchedule(
  pubsub: PubSubUnit,
): Promise<string> {
  await pubsub.schedule(
    SCHEDULED_JOBS.AUTO_PURGE,
    AUTO_PURGE_CRON,
    {},
    { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
  );
  return SCHEDULED_JOBS.AUTO_PURGE;
}

export async function unregisterPurgeSchedule(
  topic: string | null,
  { pubsub }: { pubsub: PubSubUnit },
): Promise<void> {
  if (!topic) return;
  try {
    await pubsub.unsubscribe(topic);
    await pubsub.unschedule(topic);
  } catch {
    // best-effort
  }
}

export async function registerPurgeHandler(
  topic: string,
  deps: PurgeDeps,
): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    await runAutoPurge(deps);
  });
}

async function resolveRetentionDays(
  db: NodePgDatabase,
  classId: string | null,
): Promise<number> {
  if (classId) {
    const [cls] = await db
      .select({ retentionDays: dmsDocumentClass.retentionDays })
      .from(dmsDocumentClass)
      .where(eq(dmsDocumentClass.id, classId))
      .limit(1);
    if (cls?.retentionDays) return cls.retentionDays;
  }
  const val = (await getSetting(db, SETTING_KEYS.DEFAULT_RETENTION_DAYS)) as
    | number
    | null;
  return val ?? 180;
}

export async function isDocumentHeld(
  db: NodePgDatabase,
  documentId: string,
): Promise<boolean> {
  const [hold] = await db
    .select({ id: dmsLegalHold.id })
    .from(dmsLegalHold)
    .where(
      and(
        eq(dmsLegalHold.documentId, documentId),
        isNull(dmsLegalHold.releasedAt),
      ),
    )
    .limit(1);
  return Boolean(hold);
}

/**
 * Permanently deletes a document: removes every version object and cascades
 * version rows, tags, shares, pins, and field values. Returns an array of
 * storage keys that were freed.
 */
export async function deleteDocumentPermanently(
  db: NodePgDatabase,
  documentId: string,
): Promise<string[]> {
  const versionKeys = await db
    .select({ storageKey: dmsDocumentVersion.storageKey })
    .from(dmsDocumentVersion)
    .where(eq(dmsDocumentVersion.documentId, documentId));

  const keys = versionKeys.map((v) => v.storageKey);
  for (const key of keys) {
    try {
      await removeStorage({ key });
    } catch {
      // best-effort — object may already be gone
    }
  }

  await db
    .delete(dmsDocumentTag)
    .where(eq(dmsDocumentTag.documentId, documentId));
  await db.delete(dmsShare).where(eq(dmsShare.documentId, documentId));
  await db
    .delete(dmsPin)
    .where(and(eq(dmsPin.itemType, "triage"), eq(dmsPin.itemId, documentId)));
  await db
    .delete(dmsPin)
    .where(and(eq(dmsPin.itemType, "view"), eq(dmsPin.itemId, documentId)));
  await db
    .delete(dmsDocumentVersion)
    .where(eq(dmsDocumentVersion.documentId, documentId));
  await db.delete(dmsLegalHold).where(eq(dmsLegalHold.documentId, documentId));
  await db.delete(dmsDocument).where(eq(dmsDocument.id, documentId));

  return keys;
}

async function runAutoPurge(deps: PurgeDeps): Promise<number> {
  const docs = await deps.db
    .select({
      classId: dmsDocument.classId,
      deletedAt: dmsDocument.deletedAt,
      expiredAt: dmsDocument.expiredAt,
      id: dmsDocument.id,
      status: dmsDocument.status,
    })
    .from(dmsDocument)
    .where(
      or(eq(dmsDocument.status, "deleted"), eq(dmsDocument.status, "expired")),
    );

  let processed = 0;
  for (const doc of docs) {
    if (await isDocumentHeld(deps.db, doc.id)) continue;

    const retentionDays = await resolveRetentionDays(deps.db, doc.classId);
    const anchor = doc.status === "deleted" ? doc.deletedAt : doc.expiredAt;
    if (!anchor) continue;

    const cutoff = new Date(
      anchor.getTime() + retentionDays * 24 * 60 * 60 * 1000,
    );
    if (cutoff > new Date()) continue;

    const keys = await deleteDocumentPermanently(deps.db, doc.id);

    await deps.audit.write({
      action: "purged",
      crudAction: "delete",
      entityId: doc.id,
      entityType: "dms:document",
      metadata: { storageKey: keys[0] ?? null },
    });

    await deps.pubsub.publish(DOCUMENT_EVENTS.PURGED, {
      documentId: doc.id,
      storageKey: keys[0] ?? "",
    });

    processed++;
  }

  return processed;
}

/**
 * Prunes oldest versions beyond `maxVersions` for a document. Versions under an
 * active legal hold are never pruned.
 */
export async function pruneVersions(
  db: NodePgDatabase,
  documentId: string,
  maxVersions: number,
): Promise<string[]> {
  const versions = await db
    .select({
      id: dmsDocumentVersion.id,
      storageKey: dmsDocumentVersion.storageKey,
      version: dmsDocumentVersion.version,
    })
    .from(dmsDocumentVersion)
    .where(eq(dmsDocumentVersion.documentId, documentId))
    .orderBy(desc(dmsDocumentVersion.version));

  if (versions.length <= maxVersions) return [];

  const held = await isDocumentHeld(db, documentId);
  if (held) return [];

  const toPrune = versions.slice(maxVersions);
  const ids = toPrune.map((v) => v.id);
  for (const v of toPrune) {
    try {
      await removeStorage({ key: v.storageKey });
    } catch {
      // best-effort
    }
  }
  await db
    .delete(dmsDocumentVersion)
    .where(inArray(dmsDocumentVersion.id, ids));
  return toPrune.map((v) => v.storageKey);
}

export { runAutoPurge };
