import { accountingAsset } from "#/db-schemas/asset";
import { AssetFiltersSchema } from "#/schemas/asset";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listAssets = Workflow.name("accounting.asset.list")
  .input(AssetFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.status) {
        conditions.push(eq(accountingAsset.status, input.status));
      }
      if (input.categoryId) {
        conditions.push(eq(accountingAsset.category_id, input.categoryId));
      }
      return ctx.db
        .select()
        .from(accountingAsset)
        .where(and(...conditions))
        .orderBy(desc(accountingAsset.created_at));
    }),
  );
