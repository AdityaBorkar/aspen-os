import { productsSetting } from "#/db-schemas";
import { ResolveDefaultsSchema } from "#/schemas";
import { nearestAncestorValue, walkGroupAncestors } from "#/services/group-hierarchy";
import { fetchItemStep } from "#/workflow-steps/fetch";

import { Workflow } from "@aspen-os/platform/server";

export const resolveDefaults = Workflow.name("products.lookup.resolve-defaults")
  .input(ResolveDefaultsSchema)
  .handler(async (input, ctx) => {
    // Sibling steps: the item fetch and the settings select are independent,
    // so they run concurrently; the ancestor walk follows once the item's
    // group is known.
    const [item, settingsRows] = await Promise.all([
      ctx.step.run(fetchItemStep, { id: input.itemId }),
      ctx.step.run("load-settings", async () => ctx.db.select().from(productsSetting).limit(1)),
    ]);
    const chain = await ctx.step.run("load-ancestors", async () =>
      walkGroupAncestors(ctx.db, item.item_group_id),
    );
    const [settingsRow] = settingsRows;

    return {
      costCenter:
        item.default_cost_center ??
        nearestAncestorValue(chain, (group) => group.default_cost_center),
      expenseAccount:
        item.default_expense_account ??
        nearestAncestorValue(chain, (group) => group.default_expense_account),
      incomeAccount:
        item.default_income_account ??
        nearestAncestorValue(chain, (group) => group.default_income_account),
      itemId: item.id,
      priceList:
        item.default_price_list ?? nearestAncestorValue(chain, (group) => group.default_price_list),
      supplierId:
        item.default_supplier_id ??
        nearestAncestorValue(chain, (group) => group.default_supplier_id),
      warehouseId:
        item.default_warehouse_id ??
        nearestAncestorValue(chain, (group) => group.default_warehouse_id) ??
        settingsRow?.default_warehouse_id ??
        null,
    };
  });
