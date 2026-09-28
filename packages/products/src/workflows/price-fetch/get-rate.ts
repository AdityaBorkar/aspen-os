import { productsItemPrice, productsPriceList } from "#/db-schemas";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { GetRateSchema } from "#/schemas";
import {
  fetchEligibleItem,
  fetchItemUoms,
  findPriceListByName,
  findUomRow,
  getPricelistSettings,
  getProductsSettings,
  isKnownUom,
  loadActiveRowsForItemList,
  markItemTransacted,
  rankConvertibleCandidates,
  rankItemPriceCandidates,
  resolveFetchSide,
  resolvePriceListLabel,
  resolveUomFactor,
  toDateKey,
  todayKey,
  updateLastPurchaseRate,
  validateItemPriceValues,
} from "#/services/price-fetch-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

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

    const list = await ctx.step.run("resolve-list", async () => {
      if (input.priceListId !== null && input.priceListId !== undefined) {
        const [byId] = await ctx.db
          .select()
          .from(productsPriceList)
          .where(eq(productsPriceList.id, input.priceListId))
          .limit(1);
        if (!byId) {
          throw new Error(`Price list with id "${input.priceListId}" not found.`);
        }
        return byId.is_enabled ? byId : null;
      }
      if (input.priceListName !== null && input.priceListName !== undefined) {
        const named = await findPriceListByName(ctx.db, input.priceListName);
        return named !== null && named.is_enabled ? named : null;
      }
      const label = await resolvePriceListLabel(ctx.db, item);
      if (label !== null) {
        const labeled = await findPriceListByName(ctx.db, label.label);
        if (labeled !== null && labeled.is_enabled) {
          return labeled;
        }
        return null;
      }
      const settings = await getPricelistSettings(ctx.db);
      const fallbackIds =
        input.side === "buying"
          ? [settings.default_buying_list_id]
          : input.side === "selling"
            ? [settings.default_selling_list_id]
            : [settings.default_selling_list_id, settings.default_buying_list_id];
      // oxlint-disable eslint/no-await-in-loop
      for (const fallbackId of fallbackIds) {
        if (fallbackId === null) {
          continue;
        }
        const [fallback] = await ctx.db
          .select()
          .from(productsPriceList)
          .where(eq(productsPriceList.id, fallbackId))
          .limit(1);
        if (fallback !== undefined && fallback.is_enabled) {
          return fallback;
        }
      }
      // oxlint-enable eslint/no-await-in-loop
      return null;
    });
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
      const [touched] = await ctx.db
        .update(productsItemPrice)
        .set({
          fetch_count: winner.fetch_count + 1,
          last_fetched_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(productsItemPrice.id, winner.id))
        .returning();
      if (!touched) {
        throw new Error(`Item price with id "${winner.id}" not found.`);
      }
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
        const [touched] = await ctx.db
          .update(productsItemPrice)
          .set({
            fetch_count: convertible.row.fetch_count + 1,
            last_fetched_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(productsItemPrice.id, convertible.row.id))
          .returning();
        if (!touched) {
          throw new Error(`Item price with id "${convertible.row.id}" not found.`);
        }
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
        const values = await validateItemPriceValues(ctx.db, {
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
        const [created] = await ctx.db.insert(productsItemPrice).values(values).returning();
        if (!created) {
          throw new Error("Failed to auto-insert item price.");
        }
        await markItemTransacted(ctx.db, input.itemId);
        if (autoSide === "buying") {
          await updateLastPurchaseRate(ctx.db, input.itemId, input.recordUse.rate);
        }
        await ctx.step.run("audit-and-notify", async () => {
          await ctx.audit.write({
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
          });
          await ctx.pubsub.publish(ITEM_PRICE_EVENTS.CREATED, {
            itemPrice: {
              id: created.id,
              itemId: created.item_id,
              priceListId: created.price_list_id,
            },
          });
        });
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
