import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { GetRateSchema } from "#/schemas";
import {
  fetchEligibleItem,
  fetchItemUoms,
  findUomRow,
  isKnownUom,
  resolveUomFactor,
} from "#/services/item-eligibility";
import { toDateKey, todayKey } from "#/services/pricing-dates";
import {
  loadActiveRowsForItemList,
  resolveFetchSide,
  resolvePriceList,
} from "#/services/pricing-lists";
import {
  insertItemPriceRow,
  markItemTransacted,
  touchFetchedRow,
  updateLastPurchaseRate,
} from "#/services/pricing-mutations";
import { rankConvertibleCandidates, rankItemPriceCandidates } from "#/services/pricing-rank";
import { getProductsSettings } from "#/services/pricing-settings";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";

export const getRate = Workflow.name("products.price-fetch.get-rate")
  .input(GetRateSchema)
  .handler(async (input, ctx) => {
    if (!(input.qty > 0)) {
      throw new Error("qty must be > 0.");
    }
    if (input.recordUse !== undefined && !(input.recordUse.rate >= 0)) {
      throw new Error("recordUse.rate must be >= 0.");
    }
    const dateKey =
      input.txnDate === null || input.txnDate === undefined ? todayKey() : toDateKey(input.txnDate);

    const item = await ctx.step.run("load-item", async () =>
      fetchEligibleItem(ctx.db, input.itemId, null),
    );
    const itemUoms = await ctx.step.run("load-item-uoms", async () =>
      fetchItemUoms(ctx.db, input.itemId),
    );

    const list = await ctx.step.run("resolve-list", async () =>
      resolvePriceList(ctx.db, {
        item,
        priceListId: input.priceListId,
        priceListName: input.priceListName,
        side: input.side ?? null,
      }),
    );
    if (list === null) {
      return null;
    }

    const side = resolveFetchSide(input.side ?? null, list.applicability);
    if (side === "selling" && !item.is_sales_item) {
      throw new Error(`Item "${item.item_code}" is not a sales item.`);
    }
    if (side === "buying" && !item.is_purchase_item) {
      throw new Error(`Item "${item.item_code}" is not a purchase item.`);
    }

    const requestUom = input.uom ?? item.default_uom;
    if (!isKnownUom(item, itemUoms, requestUom)) {
      return null;
    }
    const uomRow = findUomRow(itemUoms, requestUom);
    if (uomRow !== null && uomRow.must_be_whole_number && !Number.isInteger(input.qty)) {
      return null;
    }

    const rows = await ctx.step.run("load-candidates", async () =>
      loadActiveRowsForItemList(ctx.db, list.id, input.itemId),
    );
    const request = {
      batchNo: input.batchNo ?? null,
      customerId: input.customerId ?? null,
      dateKey,
      qty: input.qty,
      supplierId: input.supplierId ?? null,
      uom: requestUom,
    };
    const [winner] = rankItemPriceCandidates(rows, request);
    if (winner !== undefined) {
      const touched = await touchFetchedRow(ctx.db, winner.id);
      return {
        converted: false,
        itemPriceId: touched.id,
        priceListId: list.id,
        rate: touched.rate,
        uom: touched.uom,
      };
    }

    if (list.price_not_uom_dependent) {
      const [convertible] = rankConvertibleCandidates(rows, request, (uom) =>
        resolveUomFactor(item, itemUoms, uom),
      );
      if (convertible !== undefined) {
        const touched = await touchFetchedRow(ctx.db, convertible.row.id);
        return {
          converted: true,
          itemPriceId: touched.id,
          priceListId: list.id,
          rate: convertible.convertedRate,
          uom: requestUom,
        };
      }
    }

    const genericScope =
      (input.customerId ?? null) === null &&
      (input.supplierId ?? null) === null &&
      (input.batchNo ?? null) === null;
    if (input.recordUse !== undefined && genericScope) {
      const productsSettings = await getProductsSettings(ctx.db);
      if (productsSettings.auto_insert_price_if_missing) {
        const autoSide = side ?? (list.applicability === "both" ? null : list.applicability);
        if (autoSide === null) {
          throw new Error("side is required to auto-insert into a both-applicability list.");
        }
        const created = await insertItemPriceRow(ctx.db, {
          batchNo: null,
          customerId: null,
          itemId: input.itemId,
          leadTimeDays: null,
          minQty: null,
          note: null,
          packingUnit: null,
          priceListId: list.id,
          rate: input.recordUse.rate,
          status: "active",
          supplierId: null,
          uom: input.recordUse.uom ?? requestUom,
          validFrom: input.txnDate ?? null,
          validUpto: null,
        });
        await markItemTransacted(ctx.db, input.itemId);
        if (autoSide === "buying") {
          await updateLastPurchaseRate(ctx.db, input.itemId, input.recordUse.rate);
        }
        await runAuditNotifyStep(
          ctx,
          {
            action: AUDIT_ACTION.CREATED,
            crudAction: "create",
            entityId: created.id,
            entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
            newState: {
              autoInserted: true,
              itemId: created.item_id,
              priceListId: created.price_list_id,
              rate: created.rate,
            },
          },
          ITEM_PRICE_EVENTS.CREATED,
          {
            itemPrice: {
              id: created.id,
              itemId: created.item_id,
              priceListId: created.price_list_id,
            },
          },
        );
        return {
          autoInserted: true,
          converted: false,
          itemPriceId: created.id,
          priceListId: list.id,
          rate: created.rate,
          uom: created.uom,
        };
      }
    }
    return null;
  });
