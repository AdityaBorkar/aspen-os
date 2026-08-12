import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { driveFile, driveFolder } from "../db-schemas";
import type { ListTrashOptions } from "../types";
import { ListTrashOptionsSchema } from "../types";

const ListTrashSchema = ListTrashOptionsSchema;

export const listTrash = Workflow.name("drive.trash.list")
  .input(ListTrashSchema)
  .handler(async (input, ctx) => {
    const validated = input as ListTrashOptions | undefined;
    const limit = validated?.limit ?? 50;
    const offset = validated?.offset ?? 0;

    const folderConditions = [eq(driveFolder.isTrashed, true)];
    const fileConditions = [eq(driveFile.isTrashed, true)];

    if (validated?.ownerId) {
      folderConditions.push(eq(driveFolder.ownerId, validated.ownerId));
      fileConditions.push(eq(driveFile.ownerId, validated.ownerId));
    }

    const folders = await ctx.db
      .select()
      .from(driveFolder)
      .where(and(...folderConditions))
      .limit(limit)
      .offset(offset);

    const files = await ctx.db
      .select()
      .from(driveFile)
      .where(and(...fileConditions))
      .limit(limit)
      .offset(offset);

    return { files, folders };
  });
