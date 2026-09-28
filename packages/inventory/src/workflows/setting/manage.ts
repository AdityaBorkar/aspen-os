import { inventorySetting } from "#/db-schemas/setting";
import { evaluateReorderBreaches, scanReorderBreaches } from "#/services/reorder-scanner";
import { toDateOnly } from "#/services/stock-math";
import { getEffectiveSetting } from "#/services/stock-service";
import { ReorderScanSchema, UpdateSettingSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertReturned } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

export const getSetting = Workflow.name("inventory.setting.get")
  .input(object({}))
  .handler(async (_input, ctx) => {
    const [effective, row] = await Promise.all([
      getEffectiveSetting(ctx.db),
      ctx.db
        .select()
        .from(inventorySetting)
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);
    return { effective, row };
  });

export const updateSetting = Workflow.name("inventory.setting.update")
  .input(object({ input: UpdateSettingSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateSettingSchema, input);
    const [existing] = await ctx.db.select().from(inventorySetting).limit(1);

    const values: Partial<typeof inventorySetting.$inferInsert> = {};
    if (parsed.allowEditStockUomQty !== undefined) {
      values.allow_edit_stock_uom_qty = parsed.allowEditStockUomQty;
    }
    if (parsed.allowNegativeStock !== undefined) {
      values.allow_negative_stock = parsed.allowNegativeStock;
    }
    if (parsed.autoInsertPriceIfMissing !== undefined) {
      values.auto_insert_price_if_missing = parsed.autoInsertPriceIfMissing;
    }
    if (parsed.autoReserveOnPurchase !== undefined) {
      values.auto_reserve_on_purchase = parsed.autoReserveOnPurchase;
    }
    if (parsed.batchNamingSeries !== undefined) {
      values.batch_naming_series = parsed.batchNamingSeries;
    }
    if (parsed.cleanDescriptionHtml !== undefined) {
      values.clean_description_html = parsed.cleanDescriptionHtml;
    }
    if (parsed.defaultValuationMethod !== undefined) {
      values.default_valuation_method = parsed.defaultValuationMethod;
    }
    if (parsed.defaultWarehouseId !== undefined) {
      values.default_warehouse_id = parsed.defaultWarehouseId;
    }
    if (parsed.enableSerialBatch !== undefined) {
      values.enable_serial_batch = parsed.enableSerialBatch;
    }
    if (parsed.enableStockReservation !== undefined) {
      values.enable_stock_reservation = parsed.enableStockReservation;
    }
    if (parsed.freezeAllowedRole !== undefined) {
      values.freeze_allowed_role = parsed.freezeAllowedRole;
    }
    if (parsed.freezeOlderThanDays !== undefined) {
      values.freeze_older_than_days = parsed.freezeOlderThanDays;
    }
    if (parsed.freezeUptoDate !== undefined) {
      values.freeze_upto_date = parsed.freezeUptoDate ? toDateOnly(parsed.freezeUptoDate) : null;
    }
    if (parsed.limitPercent !== undefined) {
      values.limit_percent = parsed.limitPercent;
    }
    if (parsed.overDeliverReceiveRole !== undefined) {
      values.over_deliver_receive_role = parsed.overDeliverReceiveRole;
    }
    if (parsed.sampleRetentionWarehouseId !== undefined) {
      values.sample_retention_warehouse_id = parsed.sampleRetentionWarehouseId;
    }
    if (parsed.showBarcodeField !== undefined) {
      values.show_barcode_field = parsed.showBarcodeField;
    }
    if (parsed.stockUomDefault !== undefined) {
      values.stock_uom_default = parsed.stockUomDefault;
    }
    if (parsed.uomRestrictToItemConversions !== undefined) {
      values.uom_restrict_to_item_conversions = parsed.uomRestrictToItemConversions;
    }

    let row = existing;
    if (!row) {
      const [created] = await ctx.db
        .insert(inventorySetting)
        .values({ ...values, singleton: true })
        .returning();
      row = assertReturned(created, "Failed to create inventory settings.");
    } else {
      const [updated] = await ctx.db
        .update(inventorySetting)
        .set({ ...values, updated_at: new Date() })
        .where(eq(inventorySetting.id, row.id))
        .returning();
      row = assertReturned(updated, "Failed to update inventory settings.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.SETTING,
      newState: { id: row.id },
    });

    return row;
  });

export const runReorderScan = Workflow.name("inventory.reorder.scan")
  .input(object({ input: ReorderScanSchema }))
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReorderScanSchema, input);
    if (parsed.dryRun) {
      const breaches = await evaluateReorderBreaches(ctx.db);
      return { breaches, dryRun: true, triggered: 0 };
    }
    const breaches = await ctx.step.run("scan-reorder", async () =>
      scanReorderBreaches({ audit: ctx.audit, db: ctx.db, pubsub: ctx.pubsub }),
    );
    return { breaches, dryRun: false, triggered: breaches.length };
  });

export const listReorderBreaches = Workflow.name("inventory.reorder.breaches")
  .input(object({}))
  .handler(async (_input, ctx) => evaluateReorderBreaches(ctx.db));
