import type { JsonValue } from "@aspen-os/platform/server";

export const ITEM_EVENTS = {
  ARCHIVED: "products.item_archived",
  CREATED: "products.item_created",
  DISABLED: "products.item_disabled",
  UPDATED: "products.item_updated",
} as const;

export const ITEM_GROUP_EVENTS = {
  CREATED: "products.item_group_created",
  DISABLED: "products.item_group_disabled",
  UPDATED: "products.item_group_updated",
} as const;

export const BRAND_EVENTS = {
  CREATED: "products.brand_created",
  UPDATED: "products.brand_updated",
} as const;

export const VARIANT_EVENTS = {
  CREATED: "products.variant_created",
  TEMPLATE_UPDATED: "products.variant_template_updated",
} as const;

export const REORDER_RULE_EVENTS = {
  CREATED: "products.reorder_rule_created",
  DISABLED: "products.reorder_rule_disabled",
  UPDATED: "products.reorder_rule_updated",
} as const;

export const BARCODE_EVENTS = {
  ADDED: "products.barcode_added",
  REMOVED: "products.barcode_removed",
} as const;

export const events = {
  BARCODE_EVENTS,
  BRAND_EVENTS,
  ITEM_EVENTS,
  ITEM_GROUP_EVENTS,
  REORDER_RULE_EVENTS,
  VARIANT_EVENTS,
};

export interface ItemCreatedEvent {
  item: { id: string; itemCode: string; itemName: string };
}

export interface ItemUpdatedEvent {
  changes: Record<string, JsonValue>;
  item: { id: string; itemCode: string };
}

export interface ItemDisabledEvent {
  itemId: string;
}

export interface ItemArchivedEvent {
  itemId: string;
}

export interface ItemEventMap {
  [ITEM_EVENTS.ARCHIVED]: ItemArchivedEvent;
  [ITEM_EVENTS.CREATED]: ItemCreatedEvent;
  [ITEM_EVENTS.DISABLED]: ItemDisabledEvent;
  [ITEM_EVENTS.UPDATED]: ItemUpdatedEvent;
}

export interface ItemGroupCreatedEvent {
  itemGroup: { id: string; name: string };
}

export interface ItemGroupUpdatedEvent {
  changes: Record<string, JsonValue>;
  itemGroup: { id: string; name: string };
}

export interface ItemGroupDisabledEvent {
  itemGroupId: string;
}

export interface ItemGroupEventMap {
  [ITEM_GROUP_EVENTS.CREATED]: ItemGroupCreatedEvent;
  [ITEM_GROUP_EVENTS.DISABLED]: ItemGroupDisabledEvent;
  [ITEM_GROUP_EVENTS.UPDATED]: ItemGroupUpdatedEvent;
}

export interface BrandCreatedEvent {
  brand: { id: string; name: string };
}

export interface BrandUpdatedEvent {
  brand: { id: string; name: string };
  changes: Record<string, JsonValue>;
}

export interface BrandEventMap {
  [BRAND_EVENTS.CREATED]: BrandCreatedEvent;
  [BRAND_EVENTS.UPDATED]: BrandUpdatedEvent;
}

export interface VariantCreatedEvent {
  templateItemId: string;
  variant: { id: string; itemCode: string; variantKey: string | null };
}

export interface VariantTemplateUpdatedEvent {
  changes: Record<string, JsonValue>;
  templateItemId: string;
}

export interface VariantEventMap {
  [VARIANT_EVENTS.CREATED]: VariantCreatedEvent;
  [VARIANT_EVENTS.TEMPLATE_UPDATED]: VariantTemplateUpdatedEvent;
}

export interface ReorderRuleCreatedEvent {
  reorderRule: { id: string; itemId: string };
}

export interface ReorderRuleUpdatedEvent {
  changes: Record<string, JsonValue>;
  reorderRule: { id: string; itemId: string };
}

export interface ReorderRuleDisabledEvent {
  reorderRuleId: string;
}

export interface ReorderRuleEventMap {
  [REORDER_RULE_EVENTS.CREATED]: ReorderRuleCreatedEvent;
  [REORDER_RULE_EVENTS.DISABLED]: ReorderRuleDisabledEvent;
  [REORDER_RULE_EVENTS.UPDATED]: ReorderRuleUpdatedEvent;
}

export interface BarcodeAddedEvent {
  barcode: { barcode: string; id: string; itemId: string };
}

export interface BarcodeRemovedEvent {
  barcodeId: string;
  itemId: string;
}

export interface BarcodeEventMap {
  [BARCODE_EVENTS.ADDED]: BarcodeAddedEvent;
  [BARCODE_EVENTS.REMOVED]: BarcodeRemovedEvent;
}

export type ProductsEventMap = BarcodeEventMap &
  BrandEventMap &
  ItemEventMap &
  ItemGroupEventMap &
  ReorderRuleEventMap &
  VariantEventMap;
