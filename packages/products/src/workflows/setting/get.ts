import { productsSetting } from "#/db-schemas";
import { getOrCreateSingleton } from "#/services/singleton";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getSettings = Workflow.name("products.settings.get")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () =>
      getOrCreateSingleton(ctx.db, productsSetting, "products settings"),
    ),
  );
