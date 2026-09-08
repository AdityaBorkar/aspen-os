import { masterFilterView } from "#/db-schemas";
import { GetDefaultFilterViewSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { parse } from "valibot";

export const getDefaultFilterView = Workflow.name("masters.filter-view.get-default")
  .input(GetDefaultFilterViewSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = parse(GetDefaultFilterViewSchema, input);
      const conditions = [
        eq(masterFilterView.owner_id, parsed.ownerId),
        eq(masterFilterView.is_default, true),
      ];

      if (parsed.domain) {
        conditions.push(eq(masterFilterView.domain, parsed.domain));
      }
      if (parsed.projectId !== undefined) {
        conditions.push(
          parsed.projectId === null
            ? isNull(masterFilterView.project_id)
            : eq(masterFilterView.project_id, parsed.projectId),
        );
      }

      const [result] = await ctx.db
        .select()
        .from(masterFilterView)
        .where(and(...conditions))
        .limit(1);

      return result ?? null;
    }),
  );
