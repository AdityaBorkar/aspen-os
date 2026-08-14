import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { dmsFile, dmsFolder } from "../db-schemas";
import { type ListTrashOptions, ListTrashOptionsSchema } from "../types";

const ListTrashSchema = ListTrashOptionsSchema;

export const listItemTrash = Workflow.name("dms.trash.list")
  .input(ListTrashSchema)
  .handler(async (input, ctx) => {
    const validated = input as ListTrashOptions | undefined;
    const limit = validated?.limit ?? 50;
    const offset = validated?.offset ?? 0;

    const folderConditions = [eq(dmsFolder.isTrashed, true)];
    const fileConditions = [eq(dmsFile.isTrashed, true)];

    if (validated?.ownerId) {
      folderConditions.push(eq(dmsFolder.ownerId, validated.ownerId));
      fileConditions.push(eq(dmsFile.ownerId, validated.ownerId));
    }

    const folders = await ctx.db
      .select()
      .from(dmsFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const files = await ctx.db
      .select()
      .from(dmsFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);

    return { files, folders };
  });
