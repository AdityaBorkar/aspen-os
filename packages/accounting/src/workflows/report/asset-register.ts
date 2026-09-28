import { accountingAsset, accountingDepreciationSchedule } from "#/db-schemas/asset";
import { OverdueQuerySchema } from "#/schemas/payment";

import { Workflow } from "@aspen-os/platform/server";

export const assetRegister = Workflow.name("accounting.report.asset-register")
  .input(OverdueQuerySchema)
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const [assets, schedules] = await Promise.all([
        ctx.db.select().from(accountingAsset),
        ctx.db.select().from(accountingDepreciationSchedule),
      ]);
      const schedulesByAsset = new Map<string, typeof schedules>();
      for (const schedule of schedules) {
        const list = schedulesByAsset.get(schedule.asset_id) ?? [];
        list.push(schedule);
        schedulesByAsset.set(schedule.asset_id, list);
      }
      return assets.map((asset) => ({
        asset,
        schedules: schedulesByAsset.get(asset.id) ?? [],
      }));
    }),
  );
