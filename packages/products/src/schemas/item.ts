import {
  ItemStatusSchema,
  MaterialRequestTypeSchema,
  ValuationMethodSchema,
  VariantBasedOnSchema,
} from "#/schemas/enums";
import { IdSchema } from "#/schemas/utils";

import {
  boolean,
  date,
  integer,
  nullable,
  nullish,
  number,
  object,
  optional,
  pipe,
  string,
} from "valibot";
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
  itemCode: optional(string()),
  itemGroupId: optional(nullable(IdSchema)),
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
  allowNegativeStock: nullish(nullable(boolean())),
  allowancePercent: nullish(nullable(number())),
  autoCreateAssetsOnPurchase: optional(boolean()),
  autoCreateBatch: optional(boolean()),
  batchNumberSeries: nullish(nullable(string())),
  brandId: nullish(nullable(IdSchema)),
  countryOfOrigin: nullish(nullable(string())),
  customsTariffNo: nullish(nullable(string())),
  defaultCostCenter: nullish(nullable(string())),
  defaultCustomerId: nullish(nullable(IdSchema)),
  defaultExpenseAccount: nullish(nullable(string())),
  defaultIncomeAccount: nullish(nullable(string())),
  defaultMaterialRequestType: nullish(nullable(MaterialRequestTypeSchema)),
  defaultPriceList: nullish(nullable(string())),
  defaultPurchaseUom: nullish(nullable(string())),
  defaultSalesUom: nullish(nullable(string())),
  defaultSupplierId: nullish(nullable(IdSchema)),
  defaultUom: optional(string()),
  defaultWarehouseId: nullish(nullable(IdSchema)),
  deferralMonths: nullish(nullable(pipe(number(), integer()))),
  deferredAccount: nullish(nullable(string())),
  deliveredBySupplierDropShip: optional(boolean()),
  description: nullish(nullable(string())),
  enableDeferredExpense: optional(boolean()),
  enableDeferredRevenue: optional(boolean()),
  endOfLifeDate: nullish(nullable(date())),
  grantCommission: optional(boolean()),
  hasBatchNo: optional(boolean()),
  hasExpiryDate: optional(boolean()),
  hasSerialNo: optional(boolean()),
  hasVariants: optional(boolean()),
  hsnSac: nullish(nullable(string())),
  imageFileId: nullish(nullable(IdSchema)),
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
  itemGroupId: nullish(nullable(IdSchema)),
  itemName: optional(string()),
  lastPurchaseRate: nullish(nullable(number())),
  leadTimeDays: nullish(nullable(pipe(number(), integer()))),
  manufacturerId: nullish(nullable(IdSchema)),
  manufacturerPartNo: nullish(nullable(string())),
  maxDiscountPercent: nullish(nullable(number())),
  minimumOrderQty: nullish(nullable(number())),
  qualityInspectionTemplate: nullish(nullable(string())),
  retainSample: optional(boolean()),
  safetyStock: nullish(nullable(number())),
  serialNumberSeries: nullish(nullable(string())),
  shelfLifeDays: nullish(nullable(pipe(number(), integer()))),
  standardSellingRate: nullish(nullable(number())),
  taxCategory: nullish(nullable(string())),
  templateItemId: nullish(nullable(IdSchema)),
  valuationMethod: nullish(nullable(ValuationMethodSchema)),
  variantBasedOn: nullish(nullable(VariantBasedOnSchema)),
  variantKey: nullish(nullable(string())),
  warrantyDays: nullish(nullable(pipe(number(), integer()))),
  weightPerUnit: nullish(nullable(number())),
  weightUom: nullish(nullable(string())),
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
  limit: optional(number()),
  offset: optional(number()),
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
