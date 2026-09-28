import { productsItemUom } from "#/db-schemas";
import { AddItemUomSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addItemUom = Workflow.name("products.item-uom.add")
  .input(AddItemUomSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    if (input.conversionFactor <= 0) {
      throw new Error("conversionFactor must be greater than zero.");
    }
    const [existing] = await ctx.db
      .select({ id: productsItemUom.id })
      .from(productsItemUom)
      .where(and(eq(productsItemUom.item_id, input.itemId), eq(productsItemUom.uom, input.uom)))
      .limit(1);
    if (existing) {
      throw new Error(`UOM "${input.uom}" already exists for this item.`);
    }
    const [row] = await ctx.db
      .insert(productsItemUom)
      .values({
        conversion_factor: input.conversionFactor,
        item_id: input.itemId,
        must_be_whole_number: input.mustBeWholeNumber ?? false,
        uom: input.uom,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add item UOM.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
        newState: { conversionFactor: row.conversion_factor, itemId: row.item_id, uom: row.uom },
      });
    });
    return row;
  });
