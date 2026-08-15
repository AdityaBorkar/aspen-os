import { dmsLabel } from "#/db-schemas";
import { ListLabelsOptionsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListLabelsSchema = object({
  opts: optional(object({})),
});

export const listLabels = Workflow.name("dms.label.list")
  .input(ListLabelsSchema)
  .handler(async ({ opts }, ctx) => {
    const parsed = parse(ListLabelsOptionsSchema, opts ?? {});

    const conditions = [];

    if (parsed.ownerId) {
      if (parsed.includeGlobal) {
        conditions.push(and(eq(dmsLabel.isGlobal, true), eq(dmsLabel.ownerId, parsed.ownerId)));
      } else {
        conditions.push(eq(dmsLabel.ownerId, parsed.ownerId));
      }
    } else if (parsed.includeGlobal) {
      conditions.push(eq(dmsLabel.isGlobal, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(dmsLabel)
      .where(whereClause)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });
