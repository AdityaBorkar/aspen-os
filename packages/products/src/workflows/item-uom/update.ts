import { productsItem, productsItemUom } from "#/db-schemas";
import { UpdateItemUomSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchItemUomStep } from "#/workflow-steps/fetch-item-uom";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateItemUomSchema });

export const updateItemUom = Workflow.name("products.item-uom.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchItemUomStep, { id: input.id });
    const factorChanged =
      input.patch.conversionFactor !== undefined &&
      input.patch.conversionFactor !== current.conversion_factor;
    if (factorChanged) {
      if (input.patch.conversionFactor !== undefined && input.patch.conversionFactor <= 0) {
        throw new Error("conversionFactor must be greater than zero.");
      }
      const [item] = await ctx.db
        .select({ hasTransactions: productsItem.has_transactions })
        .from(productsItem)
        .where(eq(productsItem.id, current.item_id))
        .limit(1);
      if (item?.hasTransactions && !(input.patch.recalculate ?? false)) {
        throw new Error(
          "Conversion-factor edits after the first transaction require recalculate=true.",
        );
      }
    }
    const updates = stripUndefined({
      conversion_factor: input.patch.conversionFactor,
      must_be_whole_number: input.patch.mustBeWholeNumber,
    });
    if (Object.keys(updates).length === 0) {
      return current;
    }
    const [row] = await ctx.db
      .update(productsItemUom)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsItemUom.id, input.id))
      .returning();
    if (!row) {
      throw new Error(`Item UOM with id "${input.id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: input.patch.recalculate ? AUDIT_ACTION.RECALCULATED : AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      });
    });
    return row;
  });
