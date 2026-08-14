import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsPublicLink } from "../../db-schemas";
import { EntityTypeSchema } from "../../types";

const ListSchema = object({
  entityId: string(),
  entityType: EntityTypeSchema,
});

export const listPublicLinks = Workflow.name("dms.public-link.list")
  .input(ListSchema)
  .handler(async ({ entityId, entityType }, ctx) =>
    ctx.db
      .select()
      .from(dmsPublicLink)
      .where(and(eq(dmsPublicLink.entityId, entityId), eq(dmsPublicLink.entityType, entityType))),
  );
