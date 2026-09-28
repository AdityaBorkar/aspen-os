import { productsItemGroup, productsSetting } from "#/db-schemas";
import { ResolveDefaultsSchema } from "#/schemas";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const resolveDefaults = Workflow.name("products.lookup.resolve-defaults")
  .input(ResolveDefaultsSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const item = await ctx.step.run(fetchItemStep, { id: input.itemId });
      const [settingsRow] = await ctx.db.select().from(productsSetting).limit(1);

      const chain: (typeof productsItemGroup.$inferSelect)[] = [];
      let currentGroupId = item.item_group_id;
      // oxlint-disable eslint/no-await-in-loop
      while (currentGroupId) {
        const [group] = await ctx.db
          .select()
          .from(productsItemGroup)
          .where(eq(productsItemGroup.id, currentGroupId))
          .limit(1);
        if (!group) {
          break;
        }
        chain.push(group);
        currentGroupId = group.parent_id;
      }
      // oxlint-enable eslint/no-await-in-loop

      const nearest = (pick: (group: (typeof chain)[number]) => string | null): string | null => {
        for (const group of chain) {
          const value = pick(group);
          if (value !== null && value !== undefined) {
            return value;
          }
        }
        return null;
      };

      return {
        costCenter: item.default_cost_center ?? nearest((group) => group.default_cost_center),
        expenseAccount:
          item.default_expense_account ?? nearest((group) => group.default_expense_account),
        incomeAccount:
          item.default_income_account ?? nearest((group) => group.default_income_account),
        itemId: item.id,
        priceList: item.default_price_list ?? nearest((group) => group.default_price_list),
        supplierId: item.default_supplier_id ?? nearest((group) => group.default_supplier_id),
        warehouseId:
          item.default_warehouse_id ??
          nearest((group) => group.default_warehouse_id) ??
          settingsRow?.default_warehouse_id ??
          null,
      };
    }),
  );
