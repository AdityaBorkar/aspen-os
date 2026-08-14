import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsItemShare } from "../db-schemas";
import { ItemTypeSchema } from "../types";

const ListSharesSchema = object({
  itemId: string(),
  itemType: ItemTypeSchema,
});

export const listItemShares = Workflow.name("dms.item-share.list")
  .input(ListSharesSchema)
  .handler(async ({ itemId, itemType }, ctx) => {
    return ctx.db
      .select()
      .from(dmsItemShare)
      .where(
        and(
          eq(dmsItemShare.itemId, itemId),
          eq(dmsItemShare.itemType, itemType),
        ),
      );
  });
