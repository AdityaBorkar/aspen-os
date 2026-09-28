import { productsSetting } from "#/db-schemas";
import { UpdateSettingsSchema } from "#/schemas";
import { getOrCreateSingleton } from "#/services/singleton";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ patch: UpdateSettingsSchema });

export const updateSettings = Workflow.name("products.settings.update")
  .input(UpdateInputSchema)
  .handler(async ({ patch }, ctx) => {
    const existing = await getOrCreateSingleton(ctx.db, productsSetting, "products settings");
    const updates = stripUndefined({
      allow_negative_stock: patch.allowNegativeStock,
      auto_insert_price_if_missing: patch.autoInsertPriceIfMissing,
      batch_naming_series: patch.batchNamingSeries,
      clean_description_html: patch.cleanDescriptionHtml,
      default_item_group_id: patch.defaultItemGroupId,
      default_stock_uom: patch.defaultStockUom,
      default_valuation_method: patch.defaultValuationMethod,
      default_warehouse_id: patch.defaultWarehouseId,
      item_naming_by: patch.itemNamingBy,
      limit_percent: patch.limitPercent,
      over_deliver_receive_role: patch.overDeliverReceiveRole,
      sample_retention_warehouse_id: patch.sampleRetentionWarehouseId,
      serial_batch_enabled: patch.serialBatchEnabled,
      show_barcode_field: patch.showBarcodeField,
    });

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const [row] = await ctx.db
      .update(productsSetting)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsSetting.id, existing.id))
      .returning();
    if (!row) {
      throw new Error("Failed to update products settings.");
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.UPDATED,
      changes: updates,
      crudAction: "update",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.SETTING,
    });
    return row;
  });
