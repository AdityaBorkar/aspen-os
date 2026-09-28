import { productsSetting } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getSettings = Workflow.name("products.settings.get")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const [row] = await ctx.db.select().from(productsSetting).limit(1);
      if (row) {
        return row;
      }
      const [created] = await ctx.db.insert(productsSetting).values({}).returning();
      if (!created) {
        throw new Error("Failed to initialize products settings.");
      }
      return created;
    }),
  );
