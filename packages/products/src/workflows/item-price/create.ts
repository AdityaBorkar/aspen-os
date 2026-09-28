import { productsItemPrice } from "#/db-schemas";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { CreateItemPriceSchema } from "#/schemas";
import { validateItemPriceValues } from "#/services/price-fetch-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateItemPriceSchema });

export const createItemPrice = Workflow.name("products.item-price.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateItemPriceSchema, input);
    const values = await ctx.step.run("validate", async () =>
      validateItemPriceValues(ctx.db, {
        batchNo: parsed.batchNo ?? null,
        customerId: parsed.customerId ?? null,
        itemId: parsed.itemId,
        leadTimeDays: parsed.leadTimeDays ?? null,
        minQty: parsed.minQty ?? null,
        note: parsed.note ?? null,
        packingUnit: parsed.packingUnit ?? null,
        priceListId: parsed.priceListId,
        rate: parsed.rate,
        status: parsed.status ?? "active",
        supplierId: parsed.supplierId ?? null,
        uom: parsed.uom ?? null,
        validFrom: parsed.validFrom ?? null,
        validUpto: parsed.validUpto ?? null,
      }),
    );
    const [row] = await ctx.db.insert(productsItemPrice).values(values).returning();
    if (!row) {
      throw new Error("Failed to create item price.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
        newState: {
          itemId: row.item_id,
          priceListId: row.price_list_id,
          rate: row.rate,
          uom: row.uom,
        },
      });
      await ctx.pubsub.publish(ITEM_PRICE_EVENTS.CREATED, {
        itemPrice: { id: row.id, itemId: row.item_id, priceListId: row.price_list_id },
      });
    });
    return row;
  });
