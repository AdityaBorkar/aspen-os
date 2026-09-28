import {
  ItemStatusSchema,
  MaterialRequestTypeSchema,
  ValuationMethodSchema,
  VariantBasedOnSchema,
} from "#/schemas/enums";
import { IdSchema, ListPaginationSchema, clearable } from "#/schemas/utils";

import { boolean, date, integer, nullable, number, object, optional, pipe, string } from "valibot";
import type { InferOutput } from "valibot";

export const CreateItemSchema = object({
  allowNegativeStock: optional(nullable(boolean())),
  allowancePercent: optional(nullable(number())),
  autoCreateAssetsOnPurchase: optional(boolean(), false),
  autoCreateBatch: optional(boolean(), false),
  batchNumberSeries: optional(nullable(string())),
  brandId: optional(nullable(IdSchema)),
  countryOfOrigin: optional(nullable(string())),
  customsTariffNo: optional(nullable(string())),
  defaultCostCenter: optional(nullable(string())),
  defaultCustomerId: optional(nullable(IdSchema)),
  defaultExpenseAccount: optional(nullable(string())),
  defaultIncomeAccount: optional(nullable(string())),
  defaultMaterialRequestType: optional(nullable(MaterialRequestTypeSchema)),
  defaultPriceList: optional(nullable(string())),
  defaultPurchaseUom: optional(nullable(string())),
  defaultSalesUom: optional(nullable(string())),
  defaultSupplierId: optional(nullable(IdSchema)),
  defaultUom: string(),
  defaultWarehouseId: optional(nullable(IdSchema)),
  deferralMonths: optional(nullable(pipe(number(), integer()))),
  deferredAccount: optional(nullable(string())),
  deliveredBySupplierDropShip: optional(boolean(), false),
  description: optional(nullable(string())),
  enableDeferredExpense: optional(boolean(), false),
  enableDeferredRevenue: optional(boolean(), false),
  endOfLifeDate: optional(nullable(date())),
  grantCommission: optional(boolean(), false),
  hasBatchNo: optional(boolean(), false),
  hasExpiryDate: optional(boolean(), false),
  hasSerialNo: optional(boolean(), false),
  hasVariants: optional(boolean(), false),
  hsnSac: optional(nullable(string())),
  imageFileId: optional(nullable(IdSchema)),
  includeInManufacturing: optional(boolean(), false),
  inspectionRequiredBeforeDelivery: optional(boolean(), false),
  inspectionRequiredBeforePurchase: optional(boolean(), false),
  isCustomerProvided: optional(boolean(), false),
  isFixedAsset: optional(boolean(), false),
  isNilRatedOrExempt: optional(boolean(), false),
  isNonGst: optional(boolean(), false),
  isPurchaseItem: optional(boolean(), true),
  isSalesItem: optional(boolean(), true),
  isStockItem: optional(boolean(), true),
  // Auto-generated from the item group's naming_series when absent and
  // item_naming_by is naming_series; required when item_naming_by is item_code.
  itemCode: optional(string()),
  itemGroupId: optional(nullable(IdSchema)),
  // Defaults to itemCode when absent.
  itemName: optional(string()),
  lastPurchaseRate: optional(nullable(number())),
  leadTimeDays: optional(nullable(pipe(number(), integer()))),
  manufacturerId: optional(nullable(IdSchema)),
  manufacturerPartNo: optional(nullable(string())),
  maxDiscountPercent: optional(nullable(number())),
  minimumOrderQty: optional(nullable(number())),
  qualityInspectionTemplate: optional(nullable(string())),
  retainSample: optional(boolean(), false),
  safetyStock: optional(nullable(number())),
  serialNumberSeries: optional(nullable(string())),
  shelfLifeDays: optional(nullable(pipe(number(), integer()))),
  standardSellingRate: optional(nullable(number())),
  taxCategory: optional(nullable(string())),
  templateItemId: optional(nullable(IdSchema)),
  valuationMethod: optional(nullable(ValuationMethodSchema)),
  variantBasedOn: optional(nullable(VariantBasedOnSchema)),
  variantKey: optional(nullable(string())),
  warrantyDays: optional(nullable(pipe(number(), integer()))),
  weightPerUnit: optional(nullable(number())),
  weightUom: optional(nullable(string())),
});

export type CreateItemInput = InferOutput<typeof CreateItemSchema>;

export const UpdateItemSchema = object({
  allowNegativeStock: clearable(boolean()),
  allowancePercent: clearable(number()),
  autoCreateAssetsOnPurchase: optional(boolean()),
  autoCreateBatch: optional(boolean()),
  batchNumberSeries: clearable(string()),
  brandId: clearable(IdSchema),
  countryOfOrigin: clearable(string()),
  customsTariffNo: clearable(string()),
  defaultCostCenter: clearable(string()),
  defaultCustomerId: clearable(IdSchema),
  defaultExpenseAccount: clearable(string()),
  defaultIncomeAccount: clearable(string()),
  defaultMaterialRequestType: clearable(MaterialRequestTypeSchema),
  defaultPriceList: clearable(string()),
  defaultPurchaseUom: clearable(string()),
  defaultSalesUom: clearable(string()),
  defaultSupplierId: clearable(IdSchema),
  defaultUom: optional(string()),
  defaultWarehouseId: clearable(IdSchema),
  deferralMonths: clearable(pipe(number(), integer())),
  deferredAccount: clearable(string()),
  deliveredBySupplierDropShip: optional(boolean()),
  description: clearable(string()),
  enableDeferredExpense: optional(boolean()),
  enableDeferredRevenue: optional(boolean()),
  endOfLifeDate: clearable(date()),
  grantCommission: optional(boolean()),
  hasBatchNo: optional(boolean()),
  hasExpiryDate: optional(boolean()),
  hasSerialNo: optional(boolean()),
  hasVariants: optional(boolean()),
  hsnSac: clearable(string()),
  imageFileId: clearable(IdSchema),
  includeInManufacturing: optional(boolean()),
  inspectionRequiredBeforeDelivery: optional(boolean()),
  inspectionRequiredBeforePurchase: optional(boolean()),
  isCustomerProvided: optional(boolean()),
  isFixedAsset: optional(boolean()),
  isNilRatedOrExempt: optional(boolean()),
  isNonGst: optional(boolean()),
  isPurchaseItem: optional(boolean()),
  isSalesItem: optional(boolean()),
  isStockItem: optional(boolean()),
  itemGroupId: clearable(IdSchema),
  itemName: optional(string()),
  lastPurchaseRate: clearable(number()),
  leadTimeDays: clearable(pipe(number(), integer())),
  manufacturerId: clearable(IdSchema),
  manufacturerPartNo: clearable(string()),
  maxDiscountPercent: clearable(number()),
  minimumOrderQty: clearable(number()),
  qualityInspectionTemplate: clearable(string()),
  retainSample: optional(boolean()),
  safetyStock: clearable(number()),
  serialNumberSeries: clearable(string()),
  shelfLifeDays: clearable(pipe(number(), integer())),
  standardSellingRate: clearable(number()),
  taxCategory: clearable(string()),
  valuationMethod: clearable(ValuationMethodSchema),
  variantBasedOn: clearable(VariantBasedOnSchema),
  warrantyDays: clearable(pipe(number(), integer())),
  weightPerUnit: clearable(number()),
  weightUom: clearable(string()),
});

export type UpdateItemInput = InferOutput<typeof UpdateItemSchema>;

export const ItemFiltersSchema = object({
  brandId: optional(IdSchema),
  hasVariants: optional(boolean()),
  isDisabled: optional(boolean()),
  isFixedAsset: optional(boolean()),
  isPurchaseItem: optional(boolean()),
  isSalesItem: optional(boolean()),
  isStockItem: optional(boolean()),
  itemGroupId: optional(IdSchema),
  search: optional(string()),
  status: optional(ItemStatusSchema),
  templateItemId: optional(IdSchema),
});

export type ItemFilters = InferOutput<typeof ItemFiltersSchema>;

export const ListItemsSchema = object({
  filters: optional(ItemFiltersSchema),
  ...ListPaginationSchema.entries,
});

export type ListItemsInput = InferOutput<typeof ListItemsSchema>;

export const AddItemTaxSchema = object({
  itemId: IdSchema,
  taxCategory: optional(nullable(string())),
  taxRateOverride: optional(nullable(number())),
  taxTemplate: optional(nullable(string())),
});

export type AddItemTaxInput = InferOutput<typeof AddItemTaxSchema>;

export const AddSupplierCodeSchema = object({
  itemId: IdSchema,
  supplierId: IdSchema,
  supplierPartNo: string(),
});

export type AddSupplierCodeInput = InferOutput<typeof AddSupplierCodeSchema>;

export const AddCustomerCodeSchema = object({
  customerId: IdSchema,
  itemId: IdSchema,
  refCode: string(),
});

export type AddCustomerCodeInput = InferOutput<typeof AddCustomerCodeSchema>;
