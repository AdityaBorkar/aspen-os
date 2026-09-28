import { accountingAsset, accountingDepreciationSchedule } from "#/db-schemas/asset";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getAsset = Workflow.name("accounting.asset.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [asset] = await ctx.db
      .select()
      .from(accountingAsset)
      .where(eq(accountingAsset.id, id))
      .limit(1);
    if (!asset) {
      throw new Error(`Asset "${id}" not found.`);
    }
    const schedule = await ctx.db
      .select()
      .from(accountingDepreciationSchedule)
      .where(eq(accountingDepreciationSchedule.asset_id, id));
    return { asset, schedule };
  });
