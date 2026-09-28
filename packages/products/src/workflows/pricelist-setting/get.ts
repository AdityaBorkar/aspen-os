import { getPricelistSettings } from "#/services/price-fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getPricelistSettingsWorkflow = Workflow.name("products.pricelist-setting.get")
  .input(object({}))
  .handler(async (_input, ctx) => ctx.step.run("query", async () => getPricelistSettings(ctx.db)));
