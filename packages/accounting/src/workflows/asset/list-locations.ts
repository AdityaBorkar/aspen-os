import { accountingAssetLocation } from "#/db-schemas/asset";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";
import { object } from "valibot";

export const listAssetLocations = Workflow.name("accounting.asset-location.list")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(accountingAssetLocation).orderBy(asc(accountingAssetLocation.name)),
    ),
  );
