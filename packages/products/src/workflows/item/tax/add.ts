import { productsItemTax } from "#/db-schemas";
import { AddItemTaxSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";

export const addItemTax = Workflow.name("products.item.tax.add")
  .input(AddItemTaxSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    const [row] = await ctx.db
      .insert(productsItemTax)
      .values({
        item_id: input.itemId,
        tax_category: input.taxCategory ?? null,
        tax_rate_override: input.taxRateOverride ?? null,
        tax_template: input.taxTemplate ?? null,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add item tax.");
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.ITEM,
      newState: { itemId: row.item_id, taxTemplate: row.tax_template },
    });
    return row;
  });
