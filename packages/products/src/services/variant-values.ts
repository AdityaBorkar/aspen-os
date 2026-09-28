import type { NewProductsItem, ProductsItem } from "#/db-schemas/item";

export function buildVariantKey(attributes: Record<string, string>): string {
  const keys = Object.keys(attributes).toSorted();
  return keys.map((key) => `${key}=${attributes[key] ?? ""}`).join("|");
}

/**
 * Single source of truth for generated variant item codes: template code
 * plus the sanitized variant key, truncated to the 140-char code budget.
 */
export function variantItemCode(templateCode: string, variantKey: string): string {
  return `${templateCode}-${variantKey.replace(/[^A-Za-z0-9]+/g, "-")}`.slice(0, 140);
}

export function expandCombinations(
  valuesByAttribute: Record<string, string[]>,
): Record<string, string>[] {
  const entries = Object.entries(valuesByAttribute);
  if (entries.length === 0) {
    return [];
  }
  let combos: Record<string, string>[] = [{}];
  for (const [attribute, values] of entries) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of values) {
        next.push({ ...combo, [attribute]: value });
      }
    }
    combos = next;
  }
  return combos;
}

export interface VariantInsertOptions {
  itemCode: string;
  itemName: string;
  manufacturerId?: string | null;
  manufacturerPartNo?: string | null;
  variantKey: string;
}

/**
 * Single source of truth for the fields a variant inherits from its template.
 * Used by both single-variant creation and batch combination creation so the
 * two paths cannot drift apart.
 *
 * This is the create-time inherit set. Post-hoc sync uses the narrower
 * VARIANT_SYNC_ALLOWLIST subset (see services/item-fields.ts) — the
 * divergence is intentional: creation copies identity-adjacent defaults once,
 * while sync only refreshes fields that stay safe to overwrite later.
 */
export function buildVariantInsert(
  template: ProductsItem,
  options: VariantInsertOptions,
): NewProductsItem {
  return {
    brand_id: template.brand_id,
    default_cost_center: template.default_cost_center,
    default_expense_account: template.default_expense_account,
    default_income_account: template.default_income_account,
    default_material_request_type: template.default_material_request_type,
    default_price_list: template.default_price_list,
    default_purchase_uom: template.default_purchase_uom,
    default_sales_uom: template.default_sales_uom,
    default_supplier_id: template.default_supplier_id,
    default_uom: template.default_uom,
    default_warehouse_id: template.default_warehouse_id,
    description: template.description,
    is_purchase_item: template.is_purchase_item,
    is_sales_item: template.is_sales_item,
    is_stock_item: template.is_stock_item,
    item_code: options.itemCode,
    item_group_id: template.item_group_id,
    item_name: options.itemName,
    manufacturer_id: options.manufacturerId ?? template.manufacturer_id,
    manufacturer_part_no: options.manufacturerPartNo ?? template.manufacturer_part_no,
    template_item_id: template.id,
    variant_based_on: template.variant_based_on,
    variant_key: options.variantKey,
  };
}
