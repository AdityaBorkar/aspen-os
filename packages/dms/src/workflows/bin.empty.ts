import { Workflow } from "@aspen-os/platform/server";
import { and, eq, or, type SQL } from "drizzle-orm";

import { dmsDocument, dmsLegalHold } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { deleteDocumentPermanently } from "../services/purge-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

export interface EmptyBinFilters {
  classId?: string;
  status?: "deleted" | "expired";
}

export const emptyBin = Workflow.name("dms.bin.empty").handler(
  async (input: { filters?: EmptyBinFilters }, ctx) => {
    const filters = input.filters ?? {};

    const conditions: SQL[] = [
      or(eq(dmsDocument.status, "deleted"), eq(dmsDocument.status, "expired")) as SQL,
    ];
    if (filters.status) {
      conditions.push(eq(dmsDocument.status, filters.status));
    }
    if (filters.classId) {
      conditions.push(eq(dmsDocument.classId, filters.classId));
    }

    const rows = await ctx.db
      .select({ id: dmsDocument.id, status: dmsDocument.status })
      .from(dmsDocument)
      .where(and(...conditions));

    const heldIds = new Set<string>();
    if (rows.length > 0) {
      const heldRows = await ctx.db
        .select({ documentId: dmsLegalHold.documentId })
        .from(dmsLegalHold)
        .where(
          and(
            eq(dmsLegalHold.releasedAt, null as never),
            or(...(rows.map((row) => eq(dmsLegalHold.documentId, row.id)) as SQL[])),
          ),
        );
      for (const hold of heldRows) {
        heldIds.add(hold.documentId);
      }
    }

    const purgeable = rows.filter((row) => !heldIds.has(row.id));

    const results = await Promise.all(
      purgeable.map(async (doc) => {
        const keys = await deleteDocumentPermanently(ctx.db, doc.id);

        await ctx.audit.write({
          action: AUDIT_ACTION.PURGED,
          crudAction: "delete",
          entityId: doc.id,
          entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
          metadata: { storageKey: keys[0] ?? null },
        });

        await ctx.pubsub.publish(DOCUMENT_EVENTS.PURGED, {
          documentId: doc.id,
          storageKey: keys[0] ?? "",
        });

        return keys;
      }),
    );
    const freedKeys = results.flat();
    const purged = results.length;

    return { freedStorageKeys: freedKeys, purged, skippedHeld: heldIds.size };
  },
);
