import { productsPricelistSetting } from "#/db-schemas";
import { getOrCreateSingleton } from "#/services/singleton";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getPricelistSettingsWorkflow = Workflow.name("products.pricelist-setting.get")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      getOrCreateSingleton(ctx.db, productsPricelistSetting, "pricelist settings"),
    ),
  );
