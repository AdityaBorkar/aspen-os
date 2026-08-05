import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, optional, parse, string } from "valibot";

import * as s from "../db-schema";
import {
  ApplyLabelSchema,
  CreateLabelSchema,
  DriveItemTypeSchema,
  ListLabelsOptionsSchema,
} from "../types";

const CreateInputSchema = object({ input: CreateLabelSchema });
const ApplyInputSchema = object({ input: ApplyLabelSchema });
const LabelIdSchema = string();
const WithLabelIdSchema = object({ id: LabelIdSchema });
const RemoveLabelSchema = object({
  itemId: string(),
  itemType: DriveItemTypeSchema,
  labelId: LabelIdSchema,
});
const ListLabelsSchema = object({
  opts: optional(object({})),
});
const ListByLabelSchema = object({
  labelId: LabelIdSchema,
  opts: optional(object({})),
});

export const createLabel = Workflow.name("drive.label.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateLabelSchema, input);

    if (!parsed.isGlobal && !parsed.ownerId) {
      throw new Error(
        "Personal labels must have an ownerId. Set isGlobal=true for org-wide labels.",
      );
    }

    const [label] = await ctx.db
      .insert(s.driveLabel)
      .values({
        color: parsed.color,
        isGlobal: parsed.isGlobal,
        name: parsed.name,
        ownerId: parsed.ownerId ?? null,
      })
      .returning();

    return label;
  });

export const deleteLabel = Workflow.name("drive.label.delete")
  .input(WithLabelIdSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.db
      .delete(s.driveItemLabel)
      .where(eq(s.driveItemLabel.labelId, id));
    await ctx.db.delete(s.driveLabel).where(eq(s.driveLabel.id, id));
  });

export const applyLabel = Workflow.name("drive.label.apply")
  .input(ApplyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ApplyLabelSchema, input);

    await ctx.db
      .insert(s.driveItemLabel)
      .values({
        appliedBy: parsed.appliedBy,
        itemId: parsed.itemId,
        itemType: parsed.itemType,
        labelId: parsed.labelId,
      })
      .onConflictDoNothing();

    return { applied: true };
  });

export const removeLabel = Workflow.name("drive.label.remove")
  .input(RemoveLabelSchema)
  .handler(async ({ itemId, itemType, labelId }, ctx) => {
    await ctx.db
      .delete(s.driveItemLabel)
      .where(
        and(
          eq(s.driveItemLabel.itemId, itemId),
          eq(s.driveItemLabel.itemType, itemType),
          eq(s.driveItemLabel.labelId, labelId),
        ),
      );

    return { removed: true };
  });

export const listLabels = Workflow.name("drive.label.list")
  .input(ListLabelsSchema)
  .handler(async ({ opts }, ctx) => {
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

    return ctx.db
      .select()
      .from(s.driveLabel)
      .where(whereClause)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });

export const listByLabel = Workflow.name("drive.label.list-by-label")
  .input(ListByLabelSchema)
  .handler(async ({ labelId }, ctx) => {
    const limit = 50;
    const offset = 0;

    const itemLabels = await ctx.db
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
        ? await ctx.db
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
        ? await ctx.db
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
  });

export const labels = {
  apply: applyLabel,
  create: createLabel,
  delete: deleteLabel,
  list: listLabels,
  listByLabel,
  remove: removeLabel,
};
