import { dmsClass, dmsFile, dmsFolder, dmsLegalHold } from "#/db-schemas";
import { ListTrashOptionsSchema } from "#/types";
import type { ListTrashOptions } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { boolean, object, optional, string } from "valibot";

const ListTrashInputSchema = object({
  admin: optional(boolean(), false),
  filters: optional(ListTrashOptionsSchema),
  userId: string(),
});

export const listTrash = Workflow.name("dms.trash.list")
  .input(ListTrashInputSchema)
  .handler(async (input: { admin?: boolean; filters?: ListTrashOptions; userId: string }, ctx) => {
    const filters: ListTrashOptions = input.filters ?? { limit: 50, offset: 0 };
    const conditions: SQL[] = [or(eq(dmsFile.status, "trashed"), eq(dmsFile.status, "expired"))!];

    // Owner scoping: an explicit filters.ownerId wins; otherwise non-admins
    // are scoped to their own userId and admins see everything.
    const effectiveOwner = filters.ownerId ?? (input.admin ? undefined : input.userId);
    if (effectiveOwner) {
      conditions.push(eq(dmsFile.ownerId, effectiveOwner));
    }
    if (filters.status) {
      // SAFETY: the trash listing only queries trashed/expired rows (see the
      // base conditions above), so a caller-supplied status filter is only
      // meaningful as "trashed" | "expired" here.
      conditions.push(eq(dmsFile.status, filters.status as "trashed" | "expired"));
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

    const isHeld = (fileId: string): boolean =>
      (holdMap.get(fileId) ?? []).some((hold) => hold.releasedAt === null);

    const classIds = [
      ...new Set(rows.map((row) => row.classId).filter((value): value is string => Boolean(value))),
    ];
    const classes =
      classIds.length > 0
        ? await ctx.db.select().from(dmsClass).where(inArray(dmsClass.id, classIds))
        : [];
    const classMap = new Map(classes.map((cls) => [cls.id, cls]));

    let files = rows.map((row) => ({
      file: row,
      held: isHeld(row.id),
      hold: holdMap.get(row.id)?.find((hold) => hold.releasedAt === null) ?? null,
      provenance:
        row.status === "trashed"
          ? { at: row.deletedAt, by: row.deletedBy }
          : { at: row.expiredAt, by: null },
      retainedClass: row.classId ? (classMap.get(row.classId) ?? null) : null,
    }));

    // `held` was previously accepted but never read; filter in memory after
    // the hold join above.
    if (filters.held !== undefined) {
      files = files.filter((entry) => entry.held === filters.held);
    }

    const folderConditions: SQL[] = [eq(dmsFolder.isTrashed, true)];
    if (effectiveOwner) {
      folderConditions.push(eq(dmsFolder.ownerId, effectiveOwner));
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

    return { files, folders };
  });
