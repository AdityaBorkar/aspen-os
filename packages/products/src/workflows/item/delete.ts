import {
  productsBarcode,
  productsItem,
  productsItemAlternative,
  productsItemCustomerCode,
  productsItemSupplierCode,
  productsItemTax,
  productsItemUom,
  productsManufacturerPart,
  productsReorderRule,
  productsTemplateAttribute,
} from "#/db-schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { eq, or } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteItem = Workflow.name("products.item.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchItemStep, { id });
    if (current.has_transactions) {
      throw new Error("Cannot delete item with transactions. Disable or archive it instead.");
    }
    const [variantRef] = await ctx.db
      .select({ id: productsItem.id })
      .from(productsItem)
      .where(eq(productsItem.template_item_id, id))
      .limit(1);
    if (variantRef) {
      throw new Error("Cannot delete template while variants reference it.");
    }
    const [altRef] = await ctx.db
      .select({ id: productsItemAlternative.id })
      .from(productsItemAlternative)
      .where(
        or(
          eq(productsItemAlternative.item_id, id),
          eq(productsItemAlternative.alternative_item_id, id),
        ),
      )
      .limit(1);
    if (altRef) {
      await ctx.db
        .delete(productsItemAlternative)
        .where(
          or(
            eq(productsItemAlternative.item_id, id),
            eq(productsItemAlternative.alternative_item_id, id),
          ),
        );
    }
    await ctx.db.delete(productsBarcode).where(eq(productsBarcode.item_id, id));
    await ctx.db.delete(productsItemUom).where(eq(productsItemUom.item_id, id));
    await ctx.db.delete(productsItemTax).where(eq(productsItemTax.item_id, id));
    await ctx.db.delete(productsItemSupplierCode).where(eq(productsItemSupplierCode.item_id, id));
    await ctx.db.delete(productsItemCustomerCode).where(eq(productsItemCustomerCode.item_id, id));
    await ctx.db.delete(productsManufacturerPart).where(eq(productsManufacturerPart.item_id, id));
    await ctx.db.delete(productsReorderRule).where(eq(productsReorderRule.item_id, id));
    await ctx.db
      .delete(productsTemplateAttribute)
      .where(eq(productsTemplateAttribute.template_item_id, id));

    const [deleted] = await ctx.db
      .delete(productsItem)
      .where(eq(productsItem.id, id))
      .returning({ id: productsItem.id });
    if (!deleted) {
      throw new Error(`Item with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      });
    });
    return { deleted: true };
  });
