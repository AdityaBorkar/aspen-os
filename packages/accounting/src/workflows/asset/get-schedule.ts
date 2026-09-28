import { accountingDepreciationSchedule } from "#/db-schemas/asset";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ assetId: string() });

export const getDepreciationSchedule = Workflow.name("accounting.asset.get-schedule")
  .input(InputSchema)
  .handler(async ({ assetId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(accountingDepreciationSchedule)
        .where(eq(accountingDepreciationSchedule.asset_id, assetId)),
    ),
  );
