import { productsItem, productsItemGroup, productsSetting } from "#/db-schemas";
import { ITEM_EVENTS } from "#/pubsub";
import { CreateItemSchema } from "#/schemas";
import { assertItemCodeUnique, generateUniqueItemCode } from "#/services/item-codes";
import { assertItemFlags, assertManufacturerVariant } from "#/services/item-invariants";
import { stripHtmlToText } from "#/services/item-text";
import { toDateKey } from "#/services/pricing-dates";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateItemSchema });

export const createItem = Workflow.name("products.item.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateItemSchema, input);

    assertItemFlags({
      hasBatchNo: parsed.hasBatchNo,
      hasExpiryDate: parsed.hasExpiryDate,
      hasSerialNo: parsed.hasSerialNo,
      isStockItem: parsed.isStockItem,
      warrantyDays: parsed.warrantyDays,
    });
    if (
      parsed.hasVariants &&
      parsed.templateItemId !== undefined &&
      parsed.templateItemId !== null
    ) {
      throw new Error("A template item cannot itself reference another template.");
    }

    const [templateRow, settingsRow, groupRow] = await Promise.all([
      parsed.templateItemId === undefined || parsed.templateItemId === null
        ? Promise.resolve(null)
        : ctx.db
            .select({ hasVariants: productsItem.has_variants, id: productsItem.id })
            .from(productsItem)
            .where(eq(productsItem.id, parsed.templateItemId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
      ctx.db
        .select()
        .from(productsSetting)
        .limit(1)
        .then((rows) => rows[0] ?? null),
      parsed.itemGroupId === undefined || parsed.itemGroupId === null
        ? Promise.resolve(null)
        : ctx.db
            .select({
              namingPrefix: productsItemGroup.naming_prefix,
              namingSeries: productsItemGroup.naming_series,
            })
            .from(productsItemGroup)
            .where(eq(productsItemGroup.id, parsed.itemGroupId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
    ]);

    if (parsed.templateItemId !== undefined && parsed.templateItemId !== null) {
      if (!templateRow) {
        throw new Error(`Template item with id "${parsed.templateItemId}" not found.`);
      }
      if (!templateRow.hasVariants) {
        throw new Error("Variant must reference a template with hasVariants=true.");
      }
    }
    assertManufacturerVariant({
      manufacturerId: parsed.manufacturerId,
      manufacturerPartNo: parsed.manufacturerPartNo,
      templateItemId: parsed.templateItemId,
      variantBasedOn: parsed.variantBasedOn,
    });

    const namingBy = settingsRow?.item_naming_by ?? "item_code";

    let itemCode = parsed.itemCode?.trim();
    if (!itemCode) {
      if (namingBy === "naming_series") {
        const prefix = groupRow?.namingPrefix ?? groupRow?.namingSeries ?? null;
        itemCode = await generateUniqueItemCode(ctx.db, prefix);
      } else {
        throw new Error("itemCode is required when item_naming_by is item_code.");
      }
    }

    await assertItemCodeUnique(ctx.db, itemCode);

    const itemName = parsed.itemName?.trim() || itemCode;
    const shouldClean = settingsRow?.clean_description_html ?? true;
    const description = parsed.description ?? null;
    const cleaned = shouldClean ? stripHtmlToText(description) : description;

    const isTemplate = parsed.hasVariants ?? false;
    if (isTemplate && parsed.variantKey !== undefined && parsed.variantKey !== null) {
      throw new Error("Template items must not carry a variantKey.");
    }

    const [item] = await ctx.db
      .insert(productsItem)
      .values({
        allow_negative_stock: parsed.allowNegativeStock ?? null,
        allowance_percent: parsed.allowancePercent ?? null,
        auto_create_assets_on_purchase: parsed.autoCreateAssetsOnPurchase ?? false,
        auto_create_batch: parsed.autoCreateBatch ?? false,
        batch_number_series: parsed.batchNumberSeries ?? null,
        brand_id: parsed.brandId ?? null,
        clean_description: cleaned,
        country_of_origin: parsed.countryOfOrigin ?? null,
        customs_tariff_no: parsed.customsTariffNo ?? null,
        default_cost_center: parsed.defaultCostCenter ?? null,
        default_customer_id: parsed.defaultCustomerId ?? null,
        default_expense_account: parsed.defaultExpenseAccount ?? null,
        default_income_account: parsed.defaultIncomeAccount ?? null,
        default_material_request_type: parsed.defaultMaterialRequestType ?? null,
        default_price_list: parsed.defaultPriceList ?? null,
        default_purchase_uom: parsed.defaultPurchaseUom ?? null,
        default_sales_uom: parsed.defaultSalesUom ?? null,
        default_supplier_id: parsed.defaultSupplierId ?? null,
        default_uom: parsed.defaultUom,
        default_warehouse_id: parsed.defaultWarehouseId ?? null,
        deferral_months: parsed.deferralMonths ?? null,
        deferred_account: parsed.deferredAccount ?? null,
        delivered_by_supplier_drop_ship: parsed.deliveredBySupplierDropShip ?? false,
        description: parsed.description ?? null,
        enable_deferred_expense: parsed.enableDeferredExpense ?? false,
        enable_deferred_revenue: parsed.enableDeferredRevenue ?? false,
        end_of_life_date: parsed.endOfLifeDate ? toDateKey(parsed.endOfLifeDate) : null,
        grant_commission: parsed.grantCommission ?? false,
        has_batch_no: parsed.hasBatchNo ?? false,
        has_expiry_date: parsed.hasExpiryDate ?? false,
        has_serial_no: parsed.hasSerialNo ?? false,
        has_variants: isTemplate,
        hsn_sac: parsed.hsnSac ?? null,
        image_file_id: parsed.imageFileId ?? null,
        include_in_manufacturing: parsed.includeInManufacturing ?? false,
        inspection_required_before_delivery: parsed.inspectionRequiredBeforeDelivery ?? false,
        inspection_required_before_purchase: parsed.inspectionRequiredBeforePurchase ?? false,
        is_customer_provided: parsed.isCustomerProvided ?? false,
        is_fixed_asset: parsed.isFixedAsset ?? false,
        is_nil_rated_or_exempt: parsed.isNilRatedOrExempt ?? false,
        is_non_gst: parsed.isNonGst ?? false,
        is_purchase_item: parsed.isPurchaseItem ?? true,
        is_sales_item: parsed.isSalesItem ?? true,
        is_stock_item: parsed.isStockItem ?? true,
        item_code: itemCode,
        item_group_id: parsed.itemGroupId ?? null,
        item_name: itemName,
        last_purchase_rate: parsed.lastPurchaseRate ?? null,
        lead_time_days: parsed.leadTimeDays ?? null,
        manufacturer_id: parsed.manufacturerId ?? null,
        manufacturer_part_no: parsed.manufacturerPartNo ?? null,
        max_discount_percent: parsed.maxDiscountPercent ?? null,
        minimum_order_qty: parsed.minimumOrderQty ?? null,
        quality_inspection_template: parsed.qualityInspectionTemplate ?? null,
        retain_sample: parsed.retainSample ?? false,
        safety_stock: parsed.safetyStock ?? null,
        serial_number_series: parsed.serialNumberSeries ?? null,
        shelf_life_days: parsed.shelfLifeDays ?? null,
        standard_selling_rate: parsed.standardSellingRate ?? null,
        tax_category: parsed.taxCategory ?? null,
        template_item_id: parsed.templateItemId ?? null,
        valuation_method: parsed.valuationMethod ?? null,
        variant_based_on: parsed.variantBasedOn ?? null,
        variant_key: parsed.variantKey ?? null,
        warranty_days: parsed.warrantyDays ?? null,
        weight_per_unit: parsed.weightPerUnit ?? null,
        weight_uom: parsed.weightUom ?? null,
      })
      .returning();

    if (!item) {
      throw new Error("Failed to create item.");
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: item.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
        newState: { itemCode: item.item_code, itemName: item.item_name },
      },
      ITEM_EVENTS.CREATED,
      {
        item: { id: item.id, itemCode: item.item_code, itemName: item.item_name },
      },
    );

    return item;
  });
