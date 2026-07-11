import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import {
  driveFile,
  driveFolder,
  driveItemLabel,
  driveLabel,
} from "../db-schema";
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

export class LabelWorkflow {
  constructor(private db: DB) {}

  async create(input: CreateLabelInput) {
    const parsed = parse(CreateLabelSchema, input);

    if (!parsed.isGlobal && !parsed.ownerId) {
      throw new Error(
        "Personal labels must have an ownerId. Set isGlobal=true for org-wide labels.",
      );
    }

    const [label] = await this.db
      .insert(driveLabel)
      .values({
        color: parsed.color,
        isGlobal: parsed.isGlobal,
        name: parsed.name,
        ownerId: parsed.ownerId ?? null,
      })
      .returning();

    return label;
  }

  async delete(id: string) {
    await this.db.delete(driveItemLabel).where(eq(driveItemLabel.labelId, id));
    await this.db.delete(driveLabel).where(eq(driveLabel.id, id));
  }

  async apply(input: ApplyLabelInput) {
    const parsed = parse(ApplyLabelSchema, input);

    await this.db
      .insert(driveItemLabel)
      .values({
        appliedBy: parsed.appliedBy,
        itemId: parsed.itemId,
        itemType: parsed.itemType,
        labelId: parsed.labelId,
      })
      .onConflictDoNothing();

    return { applied: true };
  }

  async remove(itemId: string, itemType: "file" | "folder", labelId: string) {
    await this.db
      .delete(driveItemLabel)
      .where(
        and(
          eq(driveItemLabel.itemId, itemId),
          eq(driveItemLabel.itemType, itemType),
          eq(driveItemLabel.labelId, labelId),
        ),
      );

    return { removed: true };
  }

  async list(opts?: ListLabelsOptions) {
    const parsed = parse(ListLabelsOptionsSchema, opts ?? {});

    const conditions = [];

    if (parsed.ownerId) {
      if (parsed.includeGlobal) {
        conditions.push(
          and(
            eq(driveLabel.isGlobal, true),
            eq(driveLabel.ownerId, parsed.ownerId),
          ),
        );
      } else {
        conditions.push(eq(driveLabel.ownerId, parsed.ownerId));
      }
    } else if (parsed.includeGlobal) {
      conditions.push(eq(driveLabel.isGlobal, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(driveLabel)
      .where(whereClause)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  }

  async listByLabel(labelId: string, opts?: ListByLabelOptions) {
    const parsed = parse(ListByLabelOptionsSchema, opts ?? {});
    const limit = parsed.limit ?? 50;
    const offset = parsed.offset ?? 0;

    const itemLabels = await this.db
      .select({
        itemId: driveItemLabel.itemId,
        itemType: driveItemLabel.itemType,
      })
      .from(driveItemLabel)
      .where(eq(driveItemLabel.labelId, labelId))
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
        ? await this.db
            .select()
            .from(driveFolder)
            .where(
              and(
                eq(driveFolder.isTrashed, false),
                sql`${driveFolder.id} = ANY(${folderIds})`,
              ),
            )
        : [];

    const files =
      fileIds.length > 0
        ? await this.db
            .select()
            .from(driveFile)
            .where(
              and(
                eq(driveFile.isTrashed, false),
                sql`${driveFile.id} = ANY(${fileIds})`,
              ),
            )
        : [];

    return { files, folders };
  }
}
