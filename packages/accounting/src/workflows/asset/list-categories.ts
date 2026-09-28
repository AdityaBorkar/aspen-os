import { accountingAssetCategory } from "#/db-schemas/asset";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";
import { object } from "valibot";

export const listAssetCategories = Workflow.name("accounting.asset-category.list")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(accountingAssetCategory).orderBy(asc(accountingAssetCategory.name)),
    ),
  );
