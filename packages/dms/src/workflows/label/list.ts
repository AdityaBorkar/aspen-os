import { ListLabelsOptionsSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
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
        conditions.push(
          or(
            and(isNull(masterLabel.scope_type), isNull(masterLabel.scope_id)),
            and(eq(masterLabel.scope_type, "user"), eq(masterLabel.scope_id, parsed.ownerId)),
          )!,
        );
      } else {
        conditions.push(
          and(eq(masterLabel.scope_type, "user"), eq(masterLabel.scope_id, parsed.ownerId))!,
        );
      }
    } else if (parsed.includeGlobal) {
      conditions.push(and(isNull(masterLabel.scope_type), isNull(masterLabel.scope_id))!);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(masterLabel)
      .where(whereClause)
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });
