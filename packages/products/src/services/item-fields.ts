import type { ProductsItem } from "#/db-schemas/item";
import type { VariantSyncField } from "#/utils/constants";

export type SyncSnakeColumn =
  | "deferred_account"
  | "deferral_months"
  | "default_cost_center"
  | "default_expense_account"
  | "default_income_account"
  | "default_price_list"
  | "default_purchase_uom"
  | "default_sales_uom"
  | "default_supplier_id"
  | "default_warehouse_id"
  | "description"
  | "enable_deferred_expense"
  | "enable_deferred_revenue"
  | "grant_commission"
  | "inspection_required_before_delivery"
  | "inspection_required_before_purchase"
  | "max_discount_percent"
  | "quality_inspection_template"
  | "shelf_life_days"
  | "warranty_days";

/**
 * CamelCase sync field to snake_case item column. Typed against
 * VariantSyncField so a VARIANT_SYNC_ALLOWLIST change fails typecheck here
 * until the map is extended to match.
 */
export const ITEM_FIELD_MAP = {
  defaultCostCenter: "default_cost_center",
  defaultExpenseAccount: "default_expense_account",
  defaultIncomeAccount: "default_income_account",
  defaultPriceList: "default_price_list",
  defaultPurchaseUom: "default_purchase_uom",
  defaultSalesUom: "default_sales_uom",
  defaultSupplierId: "default_supplier_id",
  defaultWarehouseId: "default_warehouse_id",
  deferralMonths: "deferral_months",
  deferredAccount: "deferred_account",
  description: "description",
  enableDeferredExpense: "enable_deferred_expense",
  enableDeferredRevenue: "enable_deferred_revenue",
  grantCommission: "grant_commission",
  inspectionRequiredBeforeDelivery: "inspection_required_before_delivery",
  inspectionRequiredBeforePurchase: "inspection_required_before_purchase",
  maxDiscountPercent: "max_discount_percent",
  qualityInspectionTemplate: "quality_inspection_template",
  shelfLifeDays: "shelf_life_days",
  warrantyDays: "warranty_days",
} satisfies Record<VariantSyncField, SyncSnakeColumn>;

export type VariantSyncPatch = {
  [column in SyncSnakeColumn]?: ProductsItem[column] | undefined;
};

/**
 * Copy the requested template columns into a snake_case patch for
 * sync-from-template. Callers wrap the result in stripUndefined() and skip
 * the update when no keys remain.
 */
export function pickSyncFields(
  template: ProductsItem,
  requested: Set<string>,
  map: Record<string, SyncSnakeColumn>,
): VariantSyncPatch {
  const picked: Record<string, ProductsItem[SyncSnakeColumn] | undefined> = {};
  for (const field of requested) {
    const snakeColumn = map[field];
    if (snakeColumn === undefined) {
      continue;
    }
    picked[snakeColumn] = template[snakeColumn];
  }
  // SAFETY: every written key is a SyncSnakeColumn paired with its own
  // ProductsItem value, so the loose record holds exactly VariantSyncPatch entries.
  return picked;
}
