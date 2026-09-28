import { productsItemPrice } from "#/db-schemas";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { AssignItemPriceToPartiesSchema } from "#/schemas";
import { validateItemPriceValues } from "#/services/price-fetch-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AssignInputSchema = object({ input: AssignItemPriceToPartiesSchema });

export const assignItemPriceToParties = Workflow.name("products.item-price.assign-to-parties")
  .input(AssignInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AssignItemPriceToPartiesSchema, input);
    const customers = parsed.customerIds ?? [];
    const suppliers = parsed.supplierIds ?? [];
    if (customers.length === 0 && suppliers.length === 0) {
      throw new Error("Provide at least one customerId or supplierId.");
    }
    if (customers.length > 0 && suppliers.length > 0) {
      throw new Error("Assign to customers or suppliers in one call, never both.");
    }
    const createdIds: string[] = [];
    // oxlint-disable eslint/no-await-in-loop
    if (customers.length > 0) {
      for (const customerId of customers) {
        const values = await validateItemPriceValues(ctx.db, {
          batchNo: null,
          customerId,
          itemId: parsed.itemId,
          leadTimeDays: parsed.leadTimeDays ?? null,
          minQty: parsed.minQty ?? null,
          note: parsed.note ?? null,
          packingUnit: parsed.packingUnit ?? null,
          priceListId: parsed.priceListId,
          rate: parsed.rate,
          status: "active",
          supplierId: null,
          uom: parsed.uom ?? null,
          validFrom: parsed.validFrom ?? null,
          validUpto: parsed.validUpto ?? null,
        });
        const [row] = await ctx.db.insert(productsItemPrice).values(values).returning();
        if (!row) {
          throw new Error("Failed to assign item price.");
        }
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
          newState: { customerId, itemId: row.item_id, priceListId: row.price_list_id },
        });
        await ctx.pubsub.publish(ITEM_PRICE_EVENTS.CREATED, {
          itemPrice: { id: row.id, itemId: row.item_id, priceListId: row.price_list_id },
        });
        createdIds.push(row.id);
      }
    } else {
      for (const supplierId of suppliers) {
        const values = await validateItemPriceValues(ctx.db, {
          batchNo: null,
          customerId: null,
          itemId: parsed.itemId,
          leadTimeDays: parsed.leadTimeDays ?? null,
          minQty: parsed.minQty ?? null,
          note: parsed.note ?? null,
          packingUnit: parsed.packingUnit ?? null,
          priceListId: parsed.priceListId,
          rate: parsed.rate,
          status: "active",
          supplierId,
          uom: parsed.uom ?? null,
          validFrom: parsed.validFrom ?? null,
          validUpto: parsed.validUpto ?? null,
        });
        const [row] = await ctx.db.insert(productsItemPrice).values(values).returning();
        if (!row) {
          throw new Error("Failed to assign item price.");
        }
        await ctx.audit.write({
          action: AUDIT_ACTION.CREATED,
          crudAction: "create",
          entityId: row.id,
          entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
          newState: { itemId: row.item_id, priceListId: row.price_list_id, supplierId },
        });
        await ctx.pubsub.publish(ITEM_PRICE_EVENTS.CREATED, {
          itemPrice: { id: row.id, itemId: row.item_id, priceListId: row.price_list_id },
        });
        createdIds.push(row.id);
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    return { count: createdIds.length, createdIds };
  });
