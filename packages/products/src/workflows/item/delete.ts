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
import { assertTransition, itemLifecycleState } from "#/services/lifecycle";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

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
    assertTransition("item", itemLifecycleState(current), "deleted");
    const [variantRef] = await ctx.db
      .select({ id: productsItem.id })
      .from(productsItem)
      .where(eq(productsItem.template_item_id, id))
      .limit(1);
    if (variantRef) {
      throw new Error("Cannot delete template while variants reference it.");
    }
    const alternativeScope = or(
      eq(productsItemAlternative.item_id, id),
      eq(productsItemAlternative.alternative_item_id, id),
    );
    // One transaction for the whole cascade: a failure deletes nothing instead
    // of leaving a half-removed item graph behind.
    const deletedId = await ctx.db.transaction(async (tx) => {
      await tx.delete(productsItemAlternative).where(alternativeScope);
      await tx.delete(productsBarcode).where(eq(productsBarcode.item_id, id));
      await tx.delete(productsItemUom).where(eq(productsItemUom.item_id, id));
      await tx.delete(productsItemTax).where(eq(productsItemTax.item_id, id));
      await tx.delete(productsItemSupplierCode).where(eq(productsItemSupplierCode.item_id, id));
      await tx.delete(productsItemCustomerCode).where(eq(productsItemCustomerCode.item_id, id));
      await tx.delete(productsManufacturerPart).where(eq(productsManufacturerPart.item_id, id));
      await tx.delete(productsReorderRule).where(eq(productsReorderRule.item_id, id));
      await tx
        .delete(productsTemplateAttribute)
        .where(eq(productsTemplateAttribute.template_item_id, id));
      const [deleted] = await tx
        .delete(productsItem)
        .where(eq(productsItem.id, id))
        .returning({ id: productsItem.id });
      if (!deleted) {
        throw new Error(`Item with id "${id}" not found.`);
      }
      return deleted.id;
    });
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: deletedId,
      entityType: AUDIT_ENTITY_TYPE.ITEM,
    });
    return { deleted: true };
  });
