import { productsItem, productsSetting } from "#/db-schemas";
import { ITEM_EVENTS } from "#/pubsub";
import { UpdateItemSchema } from "#/schemas";
import { stripHtmlToText } from "#/services/item-text";
import { toDateKey } from "#/services/pricing-dates";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateItemSchema });

export const updateItem = Workflow.name("products.item.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchItemStep, { id: input.id });

    if (current.status === "archived") {
      throw new Error("Archived items cannot be updated.");
    }

    const { patch } = input;

    if (patch.hasSerialNo !== undefined && patch.hasSerialNo !== current.has_serial_no) {
      if (current.has_transactions) {
        throw new Error("Cannot toggle hasSerialNo after the first transaction.");
      }
    }
    if (patch.hasBatchNo !== undefined && patch.hasBatchNo !== current.has_batch_no) {
      if (current.has_transactions) {
        throw new Error("Cannot toggle hasBatchNo after the first transaction.");
      }
    }
    if (patch.hasVariants !== undefined && patch.hasVariants !== current.has_variants) {
      if (current.has_transactions) {
        throw new Error("Cannot toggle hasVariants after the first transaction.");
      }
    }
    if (patch.valuationMethod !== undefined && patch.valuationMethod !== current.valuation_method) {
      if (current.has_transactions) {
        throw new Error("Cannot change valuationMethod after the first transaction.");
      }
    }
    // templateItemId and variantKey are absent from UpdateItemSchema by design:
    // template binding and variant identity are immutable after creation.

    const nextHasSerial = patch.hasSerialNo ?? current.has_serial_no;
    const nextHasBatch = patch.hasBatchNo ?? current.has_batch_no;
    const nextIsStock = patch.isStockItem ?? current.is_stock_item;
    if (!nextIsStock && (nextHasSerial || nextHasBatch)) {
      throw new Error("Service items (isStockItem=false) cannot carry serial/batch flags.");
    }

    const nextWarranty =
      patch.warrantyDays === undefined ? current.warranty_days : patch.warrantyDays;
    if (nextWarranty !== null && nextWarranty !== undefined && nextWarranty > 0 && !nextHasSerial) {
      throw new Error("Warranty requires serial tracking (hasSerialNo must be true).");
    }
    const nextHasExpiry = patch.hasExpiryDate ?? current.has_expiry_date;
    if (nextHasExpiry && !nextHasBatch) {
      throw new Error("Expiry date requires batch tracking (hasBatchNo must be true).");
    }

    const [settingsRow] = await ctx.db.select().from(productsSetting).limit(1);
    const shouldClean = settingsRow?.clean_description_html ?? true;

    const descriptionInput = patch.description === undefined ? undefined : patch.description;
    const cleaned =
      descriptionInput === undefined
        ? undefined
        : shouldClean
          ? stripHtmlToText(descriptionInput)
          : descriptionInput;

    const updates = stripUndefined({
      allow_negative_stock: patch.allowNegativeStock,
      allowance_percent: patch.allowancePercent,
      auto_create_assets_on_purchase: patch.autoCreateAssetsOnPurchase,
      auto_create_batch: patch.autoCreateBatch,
      batch_number_series: patch.batchNumberSeries,
      brand_id: patch.brandId,
      clean_description: cleaned,
      country_of_origin: patch.countryOfOrigin,
      customs_tariff_no: patch.customsTariffNo,
      default_cost_center: patch.defaultCostCenter,
      default_customer_id: patch.defaultCustomerId,
      default_expense_account: patch.defaultExpenseAccount,
      default_income_account: patch.defaultIncomeAccount,
      default_material_request_type: patch.defaultMaterialRequestType,
      default_price_list: patch.defaultPriceList,
      default_purchase_uom: patch.defaultPurchaseUom,
      default_sales_uom: patch.defaultSalesUom,
      default_supplier_id: patch.defaultSupplierId,
      default_uom: patch.defaultUom,
      default_warehouse_id: patch.defaultWarehouseId,
      deferral_months: patch.deferralMonths,
      deferred_account: patch.deferredAccount,
      delivered_by_supplier_drop_ship: patch.deliveredBySupplierDropShip,
      description: patch.description,
      enable_deferred_expense: patch.enableDeferredExpense,
      enable_deferred_revenue: patch.enableDeferredRevenue,
      end_of_life_date:
        patch.endOfLifeDate === undefined
          ? undefined
          : patch.endOfLifeDate === null
            ? null
            : toDateKey(patch.endOfLifeDate),
      grant_commission: patch.grantCommission,
      has_batch_no: patch.hasBatchNo,
      has_expiry_date: patch.hasExpiryDate,
      has_serial_no: patch.hasSerialNo,
      has_variants: patch.hasVariants,
      hsn_sac: patch.hsnSac,
      image_file_id: patch.imageFileId,
      include_in_manufacturing: patch.includeInManufacturing,
      inspection_required_before_delivery: patch.inspectionRequiredBeforeDelivery,
      inspection_required_before_purchase: patch.inspectionRequiredBeforePurchase,
      is_customer_provided: patch.isCustomerProvided,
      is_fixed_asset: patch.isFixedAsset,
      is_nil_rated_or_exempt: patch.isNilRatedOrExempt,
      is_non_gst: patch.isNonGst,
      is_purchase_item: patch.isPurchaseItem,
      is_sales_item: patch.isSalesItem,
      is_stock_item: patch.isStockItem,
      item_group_id: patch.itemGroupId,
      item_name: patch.itemName,
      last_purchase_rate: patch.lastPurchaseRate,
      lead_time_days: patch.leadTimeDays,
      manufacturer_id: patch.manufacturerId,
      manufacturer_part_no: patch.manufacturerPartNo,
      max_discount_percent: patch.maxDiscountPercent,
      minimum_order_qty: patch.minimumOrderQty,
      quality_inspection_template: patch.qualityInspectionTemplate,
      retain_sample: patch.retainSample,
      safety_stock: patch.safetyStock,
      serial_number_series: patch.serialNumberSeries,
      shelf_life_days: patch.shelfLifeDays,
      standard_selling_rate: patch.standardSellingRate,
      tax_category: patch.taxCategory,
      valuation_method: patch.valuationMethod,
      variant_based_on: patch.variantBasedOn,
      warranty_days: patch.warrantyDays,
      weight_per_unit: patch.weightPerUnit,
      weight_uom: patch.weightUom,
    });

    if (Object.keys(updates).length === 0) {
      return current;
    }

    const [updated] = await ctx.db
      .update(productsItem)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsItem.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Item with id "${input.id}" not found.`);
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      },
      ITEM_EVENTS.UPDATED,
      {
        changes: eventChanges(updates),
        item: { id: updated.id, itemCode: updated.item_code },
      },
    );

    return updated;
  });
