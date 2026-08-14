import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { driveShare } from "../db-schemas";
import { DriveItemTypeSchema } from "../types";

const ListSharesSchema = object({
  itemId: string(),
  itemType: DriveItemTypeSchema,
});

export const listShares = Workflow.name("drive.share.list")
  .input(ListSharesSchema)
  .handler(async ({ itemId, itemType }, ctx) =>
    ctx.db
      .select()
      .from(driveShare)
      .where(and(eq(driveShare.itemId, itemId), eq(driveShare.itemType, itemType))),
  );
