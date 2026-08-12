import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { drivePublicLink } from "../db-schemas";
import { DriveItemTypeSchema } from "../types";

const ListSchema = object({
  itemId: string(),
  itemType: DriveItemTypeSchema,
});

export const listPublicLinks = Workflow.name("drive.public-link.list")
  .input(ListSchema)
  .handler(async ({ itemId, itemType }, ctx) => {
    return ctx.db
      .select()
      .from(drivePublicLink)
      .where(
        and(
          eq(drivePublicLink.itemId, itemId),
          eq(drivePublicLink.itemType, itemType),
        ),
      );
  });
