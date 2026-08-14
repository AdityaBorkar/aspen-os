import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsLegalHold } from "../db-schemas";
import { IdSchema } from "../types";

export const listHolds = Workflow.name("dms.hold.list")
  .input(object({ documentId: IdSchema }))
  .handler(async ({ documentId }, ctx) =>
    ctx.db
      .select()
      .from(dmsLegalHold)
      .where(eq(dmsLegalHold.documentId, documentId))
      .orderBy(dmsLegalHold.placedAt),
  );
