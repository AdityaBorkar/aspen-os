import { dmsClass, dmsFile, dmsFolder, dmsLegalHold } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export interface TrashFilters {
  classId?: string;
  deletedBy?: string;
  held?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  status?: "trashed" | "expired";
}

export const listTrash = Workflow.name("dms.trash.list").handler(
  async (input: { filters?: TrashFilters; userId: string; admin?: boolean }, ctx) => {
    const filters = input.filters ?? {};
    const conditions: SQL[] = [or(eq(dmsFile.status, "trashed"), eq(dmsFile.status, "expired"))!];

    if (!input.admin) {
      conditions.push(eq(dmsFile.ownerId, input.userId));
    }
    if (filters.status) {
      conditions.push(eq(dmsFile.status, filters.status));
    }
    if (filters.classId) {
      conditions.push(eq(dmsFile.classId, filters.classId));
    }
    if (filters.deletedBy) {
      conditions.push(eq(dmsFile.deletedBy, filters.deletedBy));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        sql`(${dmsFile.name} ilike ${term} OR coalesce(${dmsFile.docNumber}, '') ilike ${term})`,
      );
    }

    const rows = await ctx.db
      .select()
      .from(dmsFile)
      .where(and(...conditions))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    const ids = rows.map((row) => row.id);
    const holds =
      ids.length > 0
        ? await ctx.db.select().from(dmsLegalHold).where(inArray(dmsLegalHold.fileId, ids))
        : [];

    const holdMap = new Map<string, (typeof holds)[number][]>();
    for (const hold of holds) {
      const list = holdMap.get(hold.fileId) ?? [];
      list.push(hold);
      holdMap.set(hold.fileId, list);
    }

    const classIds = [
      ...new Set(rows.map((row) => row.classId).filter((value): value is string => Boolean(value))),
    ];
    const classes =
      classIds.length > 0
        ? await ctx.db.select().from(dmsClass).where(inArray(dmsClass.id, classIds))
        : [];
    const classMap = new Map(classes.map((cls) => [cls.id, cls]));

    const folderConditions: SQL[] = [eq(dmsFolder.isTrashed, true)];
    if (!input.admin) {
      folderConditions.push(eq(dmsFolder.ownerId, input.userId));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      folderConditions.push(sql`${dmsFolder.name} ilike ${term}`);
    }

    const folders = await ctx.db
      .select()
      .from(dmsFolder)
      .where(and(...folderConditions))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    return {
      files: rows.map((row) => ({
        file: row,
        held: (holdMap.get(row.id) ?? []).some((hold) => !hold.releasedAt),
        hold: holdMap.get(row.id)?.find((hold) => !hold.releasedAt) ?? null,
        provenance:
          row.status === "trashed"
            ? { at: row.deletedAt, by: row.deletedBy }
            : { at: row.expiredAt, by: null },
        retainedClass: row.classId ? (classMap.get(row.classId) ?? null) : null,
      })),
      folders,
    };
  },
);
