import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import * as s from "../db-schema";
import type {
  ApplyLabelInput,
  CreateLabelInput,
  ListByLabelOptions,
  ListLabelsOptions,
} from "../types";
import {
  ApplyLabelSchema,
  CreateLabelSchema,
  ListByLabelOptionsSchema,
  ListLabelsOptionsSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export interface LabelDeps {
  db: DB;
}

export async function createLabel(input: CreateLabelInput, { db }: LabelDeps) {
  const parsed = parse(CreateLabelSchema, input);

  if (!parsed.isGlobal && !parsed.ownerId) {
    throw new Error(
      "Personal labels must have an ownerId. Set isGlobal=true for org-wide labels.",
    );
  }

  const [label] = await db
    .insert(s.driveLabel)
    .values({
      color: parsed.color,
      isGlobal: parsed.isGlobal,
      name: parsed.name,
      ownerId: parsed.ownerId ?? null,
    })
    .returning();

  return label;
}

export async function deleteLabel({ id }: { id: string }, { db }: LabelDeps) {
  await db.delete(s.driveItemLabel).where(eq(s.driveItemLabel.labelId, id));
  await db.delete(s.driveLabel).where(eq(s.driveLabel.id, id));
}

export async function applyLabel(input: ApplyLabelInput, { db }: LabelDeps) {
  const parsed = parse(ApplyLabelSchema, input);

  await db
    .insert(s.driveItemLabel)
    .values({
      appliedBy: parsed.appliedBy,
      itemId: parsed.itemId,
      itemType: parsed.itemType,
      labelId: parsed.labelId,
    })
    .onConflictDoNothing();

  return { applied: true };
}

export async function removeLabel(
  {
    itemId,
    itemType,
    labelId,
  }: { itemId: string; itemType: "file" | "folder"; labelId: string },
  { db }: LabelDeps,
) {
  await db
    .delete(s.driveItemLabel)
    .where(
      and(
        eq(s.driveItemLabel.itemId, itemId),
        eq(s.driveItemLabel.itemType, itemType),
        eq(s.driveItemLabel.labelId, labelId),
      ),
    );

  return { removed: true };
}

export async function listLabels(
  opts: ListLabelsOptions | undefined,
  { db }: LabelDeps,
) {
  const parsed = parse(ListLabelsOptionsSchema, opts ?? {});

  const conditions = [];

  if (parsed.ownerId) {
    if (parsed.includeGlobal) {
      conditions.push(
        and(
          eq(s.driveLabel.isGlobal, true),
          eq(s.driveLabel.ownerId, parsed.ownerId),
        ),
      );
    } else {
      conditions.push(eq(s.driveLabel.ownerId, parsed.ownerId));
    }
  } else if (parsed.includeGlobal) {
    conditions.push(eq(s.driveLabel.isGlobal, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(s.driveLabel)
    .where(whereClause)
    .limit(parsed.limit ?? 50)
    .offset(parsed.offset ?? 0);
}

export async function listByLabel(
  { labelId, opts }: { labelId: string; opts?: ListByLabelOptions },
  { db }: LabelDeps,
) {
  const parsed = parse(ListByLabelOptionsSchema, opts ?? {});
  const limit = parsed.limit ?? 50;
  const offset = parsed.offset ?? 0;

  const itemLabels = await db
    .select({
      itemId: s.driveItemLabel.itemId,
      itemType: s.driveItemLabel.itemType,
    })
    .from(s.driveItemLabel)
    .where(eq(s.driveItemLabel.labelId, labelId))
    .limit(limit)
    .offset(offset);

  const folderIds = itemLabels
    .filter((l) => l.itemType === "folder")
    .map((l) => l.itemId);
  const fileIds = itemLabels
    .filter((l) => l.itemType === "file")
    .map((l) => l.itemId);

  const folders =
    folderIds.length > 0
      ? await db
          .select()
          .from(s.driveFolder)
          .where(
            and(
              eq(s.driveFolder.isTrashed, false),
              sql`${s.driveFolder.id} = ANY(${folderIds})`,
            ),
          )
      : [];

  const files =
    fileIds.length > 0
      ? await db
          .select()
          .from(s.driveFile)
          .where(
            and(
              eq(s.driveFile.isTrashed, false),
              sql`${s.driveFile.id} = ANY(${fileIds})`,
            ),
          )
      : [];

  return { files, folders };
}
