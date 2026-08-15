import { dmsLegalHold } from "#/db-schemas";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listHolds = Workflow.name("dms.hold.list")
  .input(object({ fileId: IdSchema }))
  .handler(async ({ fileId }, ctx) =>
    ctx.db
      .select()
      .from(dmsLegalHold)
      .where(eq(dmsLegalHold.fileId, fileId))
      .orderBy(dmsLegalHold.placedAt),
  );
