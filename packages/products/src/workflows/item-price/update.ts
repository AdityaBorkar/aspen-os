import { productsItemPrice } from "#/db-schemas";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { UpdateItemPriceSchema } from "#/schemas";
import { fetchItemUoms, isKnownUom, resolveUomFactor } from "#/services/item-eligibility";
import { dateKeyToDate, toDateKey } from "#/services/pricing-dates";
import { normalizePackingUnit, validateItemPriceValues } from "#/services/pricing-validation";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchItemPriceStep, fetchItemStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateItemPriceSchema });

export const updateItemPrice = Workflow.name("products.item-price.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchItemPriceStep, { id: input.id });
    if (current.status === "expired" || current.status === "cancelled") {
      throw new Error(`Cannot update an item price with status "${current.status}".`);
    }
    const { patch } = input;
    if (patch.rate !== undefined && !(patch.rate >= 0)) {
      throw new Error("rate must be >= 0.");
    }
    if (patch.packingUnit !== undefined) {
      normalizePackingUnit(patch.packingUnit);
    }

    const nextUom = patch.uom ?? current.uom;
    let nextFactor = current.conversion_factor;
    if (patch.uom !== undefined && patch.uom !== current.uom) {
      const item = await ctx.step.run(fetchItemStep, { id: current.item_id });
      const itemUoms = await fetchItemUoms(ctx.db, current.item_id);
      if (!isKnownUom(item, itemUoms, patch.uom)) {
        throw new Error(`UOM "${patch.uom}" is not defined for item "${item.item_code}".`);
      }
      nextFactor = resolveUomFactor(item, itemUoms, patch.uom);
    }

    const validityTouched =
      patch.validFrom !== undefined ||
      patch.validUpto !== undefined ||
      patch.uom !== undefined ||
      patch.minQty !== undefined;
    if (validityTouched) {
      const nextUpto =
        patch.validUpto === undefined
          ? current.valid_upto === null
            ? null
            : dateKeyToDate(current.valid_upto)
          : patch.validUpto;
      await validateItemPriceValues(
        ctx.db,
        {
          batchNo: current.batch_no,
          customerId: current.customer_id,
          itemId: current.item_id,
          leadTimeDays:
            patch.leadTimeDays === undefined ? current.lead_time_days : patch.leadTimeDays,
          minQty: patch.minQty === undefined ? current.min_qty : patch.minQty,
          note: current.note,
          packingUnit: current.packing_unit,
          priceListId: current.price_list_id,
          rate: patch.rate ?? current.rate,
          status: current.status === "draft" ? "draft" : "active",
          supplierId: current.supplier_id,
          uom: nextUom,
          validFrom: patch.validFrom ?? dateKeyToDate(current.valid_from),
          validUpto: nextUpto,
        },
        current.id,
      );
    }

    const updates = stripUndefined({
      conversion_factor: patch.uom === undefined ? undefined : nextFactor,
      lead_time_days: patch.leadTimeDays,
      min_qty: patch.minQty,
      note: patch.note,
      packing_unit: patch.packingUnit,
      rate: patch.rate,
      uom: patch.uom,
      valid_from: patch.validFrom === undefined ? undefined : toDateKey(patch.validFrom),
      valid_upto:
        patch.validUpto === undefined
          ? undefined
          : patch.validUpto === null
            ? null
            : toDateKey(patch.validUpto),
    });
    if (Object.keys(updates).length === 0) {
      return current;
    }
    const [updated] = await ctx.db
      .update(productsItemPrice)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsItemPrice.id, input.id))
      .returning();
    if (!updated) {
      throw new Error(`Item price with id "${input.id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
      },
      ITEM_PRICE_EVENTS.UPDATED,
      {
        changes: eventChanges(updates),
        itemPrice: { id: updated.id, itemId: updated.item_id, priceListId: updated.price_list_id },
      },
    );
    return updated;
  });
