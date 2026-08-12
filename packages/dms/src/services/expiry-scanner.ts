import type { AuditUnit, PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { dmsDocument } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { SCHEDULED_JOBS } from "../utils/constants";

export interface ExpiryScannerDeps {
  audit: AuditUnit;
  db: NodePgDatabase;
  pubsub: PubSubUnit;
}

export const EXPIRY_SCAN_CRON = "5 0 * * *";

export async function registerExpiryScanner(
  pubsub: PubSubUnit,
): Promise<string> {
  await pubsub.schedule(
    SCHEDULED_JOBS.EXPIRY_SCAN,
    EXPIRY_SCAN_CRON,
    {},
    { retryBackoff: true, retryDelay: 60, retryLimit: 3 },
  );
  return SCHEDULED_JOBS.EXPIRY_SCAN;
}

export async function unregisterExpiryScanner(
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

export async function registerExpiryScanHandler(
  topic: string,
  deps: ExpiryScannerDeps,
): Promise<void> {
  await deps.pubsub.subscribe(topic, async () => {
    await scanExpiredDocuments(deps);
  });
}

export async function scanExpiredDocuments(
  deps: ExpiryScannerDeps,
): Promise<number> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const rows = await deps.db
    .select({ expiryDate: dmsDocument.expiryDate, id: dmsDocument.id })
    .from(dmsDocument)
    .where(
      and(
        eq(dmsDocument.status, "active"),
        sql`${dmsDocument.expiryDate} IS NOT NULL AND ${dmsDocument.expiryDate} <= ${today}`,
      ),
    );

  let processed = 0;
  for (const row of rows) {
    const updated = await deps.db
      .update(dmsDocument)
      .set({ expiredAt: now, status: "expired", updatedAt: now })
      .where(and(eq(dmsDocument.id, row.id), eq(dmsDocument.status, "active")))
      .returning();

    if (updated.length === 0) continue;

    await deps.audit.write({
      action: "expired",
      entityId: row.id,
      entityType: "dms:document",
      metadata: { expiryDate: row.expiryDate },
    });

    await deps.pubsub.publish(DOCUMENT_EVENTS.EXPIRED, {
      documentId: row.id,
      expiryDate: row.expiryDate,
    });

    processed++;
  }

  return processed;
}
