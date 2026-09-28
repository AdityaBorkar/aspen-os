import type { ProductsItem } from "#/db-schemas/item";
import type { UpdateItemInput } from "#/schemas/item";

/**
 * Resolved serial/batch/expiry/warranty/stock flags shared by item creation
 * (parsed input) and item update (reconstructed next values). Both paths
 * enforce the same domain rules so an update cannot produce a state that
 * creation would reject.
 */
export interface ItemFlagValues {
  hasBatchNo: boolean;
  hasExpiryDate: boolean;
  hasSerialNo: boolean;
  isStockItem: boolean;
  warrantyDays?: number | null;
}

export function assertItemFlags(flags: ItemFlagValues): void {
  if (
    flags.warrantyDays !== undefined &&
    flags.warrantyDays !== null &&
    flags.warrantyDays > 0 &&
    !flags.hasSerialNo
  ) {
    throw new Error("Warranty requires serial tracking (hasSerialNo must be true).");
  }
  if (flags.hasExpiryDate && !flags.hasBatchNo) {
    throw new Error("Expiry date requires batch tracking (hasBatchNo must be true).");
  }
  if (!flags.isStockItem && (flags.hasSerialNo || flags.hasBatchNo)) {
    throw new Error("Service items (isStockItem=false) cannot carry serial/batch flags.");
  }
}

export interface ImmutableFieldSpec {
  currentKey: "has_batch_no" | "has_serial_no" | "has_variants" | "valuation_method";
  key: "hasBatchNo" | "hasSerialNo" | "hasVariants" | "valuationMethod";
  verb: "change" | "toggle";
}

export const ITEM_IMMUTABLE_AFTER_TRANSACTIONS: readonly ImmutableFieldSpec[] = [
  { currentKey: "has_serial_no", key: "hasSerialNo", verb: "toggle" },
  { currentKey: "has_batch_no", key: "hasBatchNo", verb: "toggle" },
  { currentKey: "has_variants", key: "hasVariants", verb: "toggle" },
  { currentKey: "valuation_method", key: "valuationMethod", verb: "change" },
];

type ImmutablePatch = Pick<
  UpdateItemInput,
  "hasBatchNo" | "hasSerialNo" | "hasVariants" | "valuationMethod"
>;

type ImmutableCurrent = Pick<
  ProductsItem,
  "has_batch_no" | "has_serial_no" | "has_transactions" | "has_variants" | "valuation_method"
>;

/**
 * Reject toggles of transaction-sensitive item fields once the item has
 * transactions. Specs pair each camelCase patch key with its snake_case
 * current key; only changed values on transacted items throw.
 */
export function assertImmutableAfterTransactions(
  current: ImmutableCurrent,
  patch: ImmutablePatch,
  specs: readonly ImmutableFieldSpec[],
): void {
  for (const spec of specs) {
    const next = patch[spec.key];
    if (next !== undefined && next !== current[spec.currentKey]) {
      if (current.has_transactions) {
        throw new Error(`Cannot ${spec.verb} ${spec.key} after the first transaction.`);
      }
    }
  }
}

export interface ManufacturerVariantInput {
  manufacturerId?: string | null;
  manufacturerPartNo?: string | null;
  templateItemId?: string | null;
  variantBasedOn?: string | null;
}

/**
 * Single manufacturer-variant gate for both creation paths. Accepts the union
 * of previously accepted evidence — manufacturerId or manufacturerPartNo
 * (variant creation) plus templateItemId (item creation, where the template
 * linkage carries the manufacturer context) — so every input either path used
 * to accept still passes, while manufacturer-less manufacturer-based variants
 * still fail.
 */
export function assertManufacturerVariant(input: ManufacturerVariantInput): void {
  if (input.variantBasedOn !== "manufacturer") {
    return;
  }
  if (
    (input.manufacturerId === undefined || input.manufacturerId === null) &&
    (input.manufacturerPartNo === undefined || input.manufacturerPartNo === null) &&
    (input.templateItemId === undefined || input.templateItemId === null)
  ) {
    throw new Error("Manufacturer-based variants require manufacturerId or manufacturerPartNo.");
  }
}

/**
 * Shared template gate for single-variant and combination creation: the
 * template must be a variant template and must not be disabled.
 */
export function assertTemplateCreatable(
  template: Pick<ProductsItem, "has_variants" | "is_disabled" | "status">,
): void {
  if (!template.has_variants) {
    throw new Error("Variants require a template with hasVariants=true.");
  }
  if (template.status !== "active" || template.is_disabled) {
    throw new Error("Cannot create variants from a disabled template.");
  }
}
