import { ITEM_PRICE_STATUS, ITEM_STATUS } from "#/utils/constants";

export type LifecycleEntity =
  | "group"
  | "item"
  | "item-price"
  | "price-list"
  | "reorder-rule"
  | "variant";

const DELETED_TARGET = "deleted";

function entityLabel(entity: LifecycleEntity): string {
  if (entity === "item-price") {
    return "Item price";
  }
  if (entity === "price-list") {
    return "Price list";
  }
  if (entity === "reorder-rule") {
    return "Reorder rule";
  }
  const [head, ...tail] = entity;
  return head === undefined ? entity : `${head.toUpperCase()}${tail.join("")}`;
}

/**
 * Lifecycle transition table. `from` is the entity's current state, `to` is
 * the requested target state. Same-state requests are illegal: enabling an
 * already-enabled row (or cancelling a cancelled price) is a caller bug, not
 * a no-op, so it fails loudly instead of emitting a duplicate event.
 */
export function canTransition(entity: LifecycleEntity, from: string, to: string): boolean {
  if (entity === "group" || entity === "price-list" || entity === "reorder-rule") {
    return (from === "enabled" && to === "disabled") || (from === "disabled" && to === "enabled");
  }
  if (entity === "variant") {
    return (
      (from === ITEM_STATUS.ACTIVE && to === ITEM_STATUS.DISABLED) ||
      (from === ITEM_STATUS.DISABLED && to === ITEM_STATUS.ACTIVE)
    );
  }
  if (entity === "item-price") {
    if (to !== ITEM_PRICE_STATUS.CANCELLED && to !== ITEM_PRICE_STATUS.EXPIRED) {
      return false;
    }
    return from === ITEM_PRICE_STATUS.ACTIVE || from === ITEM_PRICE_STATUS.DRAFT;
  }
  if (from === ITEM_STATUS.ACTIVE) {
    return to === ITEM_STATUS.DISABLED || to === ITEM_STATUS.ARCHIVED || to === DELETED_TARGET;
  }
  if (from === ITEM_STATUS.DISABLED) {
    return to === ITEM_STATUS.ACTIVE || to === ITEM_STATUS.ARCHIVED || to === DELETED_TARGET;
  }
  if (from === ITEM_STATUS.ARCHIVED) {
    return to === DELETED_TARGET;
  }
  return false;
}

/** Throw when `to` is not a legal target from the entity's current state. */
export function assertTransition(entity: LifecycleEntity, from: string, to: string): void {
  if (!canTransition(entity, from, to)) {
    throw new Error(`${entityLabel(entity)} cannot move from "${from}" to "${to}".`);
  }
}

/** Item state reader: `status` is authoritative (`active`/`disabled`/`archived`). */
export function itemLifecycleState(row: { is_disabled: boolean; status: string }): string {
  return row.status;
}

/** Variant state reader: variants are item rows, so `status` is authoritative. */
export function variantLifecycleState(row: { is_disabled: boolean; status: string }): string {
  return row.status;
}

/** Group state reader: boolean flag maps to `enabled`/`disabled`. */
export function groupLifecycleState(row: { is_disabled: boolean }): string {
  return row.is_disabled ? "disabled" : "enabled";
}

/** Reorder-rule state reader: boolean flag maps to `enabled`/`disabled`. */
export function reorderRuleLifecycleState(row: { is_disabled: boolean }): string {
  return row.is_disabled ? "disabled" : "enabled";
}

/** Price-list state reader: `is_enabled` maps to `enabled`/`disabled`. */
export function priceListLifecycleState(row: { is_enabled: boolean }): string {
  return row.is_enabled ? "enabled" : "disabled";
}

/** Item-price state reader: `status` is authoritative (`active`/`draft`/`cancelled`/`expired`). */
export function itemPriceLifecycleState(row: { status: string }): string {
  return row.status;
}
