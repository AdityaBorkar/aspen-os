import { dmsLabel } from "#/db-schemas";
import { ListLabelsOptionsSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, or } from "drizzle-orm";
import { object, optional } from "valibot";

const ListLabelsSchema = object({
  opts: optional(ListLabelsOptionsSchema),
});

export const listLabels = Workflow.name("dms.label.list")
  .input(ListLabelsSchema)
  .handler(async ({ opts }, ctx) => {
    const parsed = opts ?? { includeGlobal: true, limit: 50, offset: 0 };

    const conditions = [];

    if (parsed.ownerId) {
      if (parsed.includeGlobal) {
        conditions.push(or(eq(dmsLabel.isGlobal, true), eq(dmsLabel.ownerId, parsed.ownerId)));
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
