export const ITEM_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  DISABLED: "disabled",
} as const;

export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];

export const NAMING_MODE = {
  ITEM_CODE: "item_code",
  NAMING_SERIES: "naming_series",
} as const;

export type NamingMode = (typeof NAMING_MODE)[keyof typeof NAMING_MODE];

export const VALUATION_METHOD = {
  FIFO: "fifo",
  MOVING_AVERAGE: "moving_average",
} as const;

export type ValuationMethod = (typeof VALUATION_METHOD)[keyof typeof VALUATION_METHOD];

export const MATERIAL_REQUEST_TYPE = {
  MANUFACTURE: "manufacture",
  PURCHASE: "purchase",
  TRANSFER: "transfer",
} as const;

export type MaterialRequestType =
  (typeof MATERIAL_REQUEST_TYPE)[keyof typeof MATERIAL_REQUEST_TYPE];

export const BARCODE_TYPE = {
  EAN: "ean",
  OTHER: "other",
  UPC: "upc",
} as const;

export type BarcodeType = (typeof BARCODE_TYPE)[keyof typeof BARCODE_TYPE];

export const VARIANT_BASED_ON = {
  ATTRIBUTE: "attribute",
  MANUFACTURER: "manufacturer",
} as const;

export type VariantBasedOn = (typeof VARIANT_BASED_ON)[keyof typeof VARIANT_BASED_ON];

export const AUDIT_ENTITY_TYPE = {
  ATTRIBUTE: "products:attribute",
  BARCODE: "products:barcode",
  BRAND: "products:brand",
  GROUP: "products:group",
  ITEM: "products:item",
  ITEM_PRICE: "products:item-price",
  MANUFACTURER: "products:manufacturer",
  PRICELIST_SETTING: "products:pricelist-setting",
  PRICE_LIST: "products:price-list",
  REORDER_RULE: "products:reorder_rule",
  SETTING: "products:setting",
  VARIANT: "products:variant",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPE)[keyof typeof AUDIT_ENTITY_TYPE];

export const AUDIT_ACTION = {
  ARCHIVED: "archived",
  CANCELLED: "cancelled",
  CREATED: "created",
  DELETED: "deleted",
  DISABLED: "disabled",
  ENABLED: "enabled",
  EXPIRED: "expired",
  RECALCULATED: "recalculated",
  SYNCED: "synced",
  UPDATED: "updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const VARIANT_SYNC_ALLOWLIST = [
  "description",
  "defaultWarehouseId",
  "defaultPriceList",
  "defaultSupplierId",
  "defaultExpenseAccount",
  "defaultIncomeAccount",
  "defaultCostCenter",
  "defaultSalesUom",
  "defaultPurchaseUom",
  "maxDiscountPercent",
  "grantCommission",
  "inspectionRequiredBeforePurchase",
  "inspectionRequiredBeforeDelivery",
  "qualityInspectionTemplate",
  "enableDeferredRevenue",
  "enableDeferredExpense",
  "deferredAccount",
  "deferralMonths",
  "shelfLifeDays",
  "warrantyDays",
] as const;

export type VariantSyncField = (typeof VARIANT_SYNC_ALLOWLIST)[number];

export const PRICE_LIST_APPLICABILITY = {
  BOTH: "both",
  BUYING: "buying",
  SELLING: "selling",
} as const;

export type PriceListApplicability =
  (typeof PRICE_LIST_APPLICABILITY)[keyof typeof PRICE_LIST_APPLICABILITY];

export const ITEM_PRICE_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  DRAFT: "draft",
  EXPIRED: "expired",
} as const;

export type ItemPriceStatus = (typeof ITEM_PRICE_STATUS)[keyof typeof ITEM_PRICE_STATUS];

export const STANDARD_SELLING_PRICE_LIST = "Standard Selling";

export const STANDARD_BUYING_PRICE_LIST = "Standard Buying";
