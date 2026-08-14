import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";

import { dmsDocument, dmsDocumentClass, dmsLegalHold } from "../db-schemas";

export interface BinFilters {
  classId?: string;
  deletedBy?: string;
  held?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  status?: "deleted" | "expired";
}

export const listBin = Workflow.name("dms.bin.list").handler(
  async (input: { filters?: BinFilters; userId: string; admin?: boolean }, ctx) => {
    const filters = input.filters ?? {};
    const conditions: SQL[] = [
      or(eq(dmsDocument.status, "deleted"), eq(dmsDocument.status, "expired")) as SQL,
    ];

    if (!input.admin) {
      conditions.push(eq(dmsDocument.ownerId, input.userId));
    }
    if (filters.status) {
      conditions.push(eq(dmsDocument.status, filters.status));
    }
    if (filters.classId) {
      conditions.push(eq(dmsDocument.classId, filters.classId));
    }
    if (filters.deletedBy) {
      conditions.push(eq(dmsDocument.deletedBy, filters.deletedBy));
    }

    const rows = await ctx.db
      .select()
      .from(dmsDocument)
      .where(and(...conditions))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    const ids = rows.map((r) => r.id);
    const holds = ids.length
      ? await ctx.db.select().from(dmsLegalHold).where(inArray(dmsLegalHold.documentId, ids))
      : [];

    const holdMap = new Map<string, (typeof holds)[number][]>();
    for (const hold of holds) {
      const list = holdMap.get(hold.documentId) ?? [];
      list.push(hold);
      holdMap.set(hold.documentId, list);
    }

    const classIds = [...new Set(rows.map((r) => r.classId).filter(Boolean))] as string[];
    const classes = classIds.length
      ? await ctx.db.select().from(dmsDocumentClass).where(inArray(dmsDocumentClass.id, classIds))
      : [];
    const classMap = new Map(classes.map((c) => [c.id, c]));

    return rows.map((row) => ({
      document: row,
      held: (holdMap.get(row.id) ?? []).some((h) => !h.releasedAt),
      hold: holdMap.get(row.id)?.find((h) => !h.releasedAt) ?? null,
      provenance:
        row.status === "deleted"
          ? { at: row.deletedAt, by: row.deletedBy }
          : { at: row.expiredAt, by: null },
      retainedClass: row.classId ? (classMap.get(row.classId) ?? null) : null,
    }));
  },
);
