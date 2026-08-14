import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsPublicLink } from "../db-schemas";
import { ItemTypeSchema } from "../types";

const ListSchema = object({
  itemId: string(),
  itemType: ItemTypeSchema,
});

export const listItemPublicLinks = Workflow.name("dms.public-link.list")
  .input(ListSchema)
  .handler(async ({ itemId, itemType }, ctx) =>
    ctx.db
      .select()
      .from(dmsPublicLink)
      .where(and(eq(dmsPublicLink.itemId, itemId), eq(dmsPublicLink.itemType, itemType))),
  );
