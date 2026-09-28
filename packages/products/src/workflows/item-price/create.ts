import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { CreateItemPriceSchema } from "#/schemas";
import { insertItemPriceRow } from "#/services/pricing-mutations";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateItemPriceSchema });

export const createItemPrice = Workflow.name("products.item-price.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateItemPriceSchema, input);
    const row = await ctx.step.run("validate", async () =>
      insertItemPriceRow(ctx.db, {
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
    await runAuditNotifyStep(
      ctx,
      {
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
      },
      ITEM_PRICE_EVENTS.CREATED,
      {
        itemPrice: { id: row.id, itemId: row.item_id, priceListId: row.price_list_id },
      },
    );
    return row;
  });
