import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { GetRateSchema } from "#/schemas";
import { fetchEligibleItem, fetchItemUoms, resolveUom } from "#/services/item-eligibility";
import { toDateKey, todayKey } from "#/services/pricing-dates";
import { loadActiveRows, resolveFetchSide, resolvePriceList } from "#/services/pricing-lists";
import {
  insertItemPriceRow,
  markItemTransacted,
  touchFetchedRow,
} from "#/services/pricing-mutations";
import { rankCandidates } from "#/services/pricing-rank";
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

    const [item, itemUoms] = await ctx.step.run("load-item", async () =>
      Promise.all([
        fetchEligibleItem(ctx.db, input.itemId, null),
        fetchItemUoms(ctx.db, input.itemId),
      ]),
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
    const resolvedUom = resolveUom(item, itemUoms, requestUom);
    if (resolvedUom === null) {
      return null;
    }
    if (
      resolvedUom.row !== null &&
      resolvedUom.row.must_be_whole_number &&
      !Number.isInteger(input.qty)
    ) {
      return null;
    }

    const rows = await ctx.step.run("load-candidates", async () =>
      loadActiveRows(ctx.db, { itemId: input.itemId, priceListId: list.id }),
    );
    const request = {
      batchNo: input.batchNo ?? null,
      customerId: input.customerId ?? null,
      dateKey,
      qty: input.qty,
      supplierId: input.supplierId ?? null,
      uom: requestUom,
    };
    const [winner] = rankCandidates(rows, request, { includeUom: "same" });
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
      const [convertible] = rankCandidates(rows, request, {
        convert: (uom) => resolveUom(item, itemUoms, uom)?.factor ?? null,
        includeUom: "convertible",
      });
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
    const { recordUse } = input;
    if (recordUse !== undefined && genericScope) {
      const productsSettings = await getProductsSettings(ctx.db);
      if (productsSettings.auto_insert_price_if_missing) {
        const autoSide = side ?? (list.applicability === "both" ? null : list.applicability);
        if (autoSide === null) {
          throw new Error("side is required to auto-insert into a both-applicability list.");
        }
        // Validate-before-write stays: insertItemPriceRow validates, then the
        // insert + transacted bookkeeping commit atomically. Audit/notify stays
        // outside the transaction — publishing events must never run inside a
        // DB transaction that can still roll back.
        const created = await ctx.db.transaction(async (tx) => {
          const row = await insertItemPriceRow(tx, {
            batchNo: null,
            customerId: null,
            itemId: input.itemId,
            leadTimeDays: null,
            minQty: null,
            note: null,
            packingUnit: null,
            priceListId: list.id,
            rate: recordUse.rate,
            status: "active",
            supplierId: null,
            uom: recordUse.uom ?? requestUom,
            validFrom: input.txnDate ?? null,
            validUpto: null,
          });
          await markItemTransacted(
            tx,
            input.itemId,
            autoSide === "buying" ? { lastPurchaseRate: recordUse.rate } : undefined,
          );
          return row;
        });
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
