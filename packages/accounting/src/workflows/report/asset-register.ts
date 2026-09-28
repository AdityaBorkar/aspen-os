import { accountingAsset, accountingDepreciationSchedule } from "#/db-schemas/asset";
import { OverdueQuerySchema } from "#/schemas/payment";

import { Workflow } from "@aspen-os/platform/server";

export const assetRegister = Workflow.name("accounting.report.asset-register")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const assets = await ctx.db.select().from(accountingAsset);
      const schedules = await ctx.db.select().from(accountingDepreciationSchedule);
      return assets.map((asset) => ({
        asset,
        schedules: schedules.filter((schedule) => schedule.asset_id === asset.id),
      }));
    }),
  );
