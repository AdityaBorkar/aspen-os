import { productsItemGroup } from "#/db-schemas";
import { buildGroupTree } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getGroupTree = Workflow.name("products.group.tree")
  .input(object({}))
  .handler(async (_input, ctx) =>
    ctx.step.run("query", async () => {
      const all = await ctx.db
        .select({
          id: productsItemGroup.id,
          name: productsItemGroup.name,
          parentId: productsItemGroup.parent_id,
        })
        .from(productsItemGroup);
      return buildGroupTree(all);
    }),
  );
