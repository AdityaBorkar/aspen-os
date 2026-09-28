import type { JsonValue } from "@aspen-os/platform/server";

export const ITEM_EVENTS = {
  ARCHIVED: "products.item_archived",
  CREATED: "products.item_created",
  DISABLED: "products.item_disabled",
  ENABLED: "products.item_enabled",
  UPDATED: "products.item_updated",
} as const;

export const ITEM_GROUP_EVENTS = {
  CREATED: "products.item_group_created",
  DISABLED: "products.item_group_disabled",
  ENABLED: "products.item_group_enabled",
  UPDATED: "products.item_group_updated",
} as const;

export const BRAND_EVENTS = {
  CREATED: "products.brand_created",
  UPDATED: "products.brand_updated",
} as const;

export const VARIANT_EVENTS = {
  CREATED: "products.variant_created",
  DISABLED: "products.variant_disabled",
  ENABLED: "products.variant_enabled",
  TEMPLATE_UPDATED: "products.variant_template_updated",
} as const;

export const REORDER_RULE_EVENTS = {
  CREATED: "products.reorder_rule_created",
  DISABLED: "products.reorder_rule_disabled",
  ENABLED: "products.reorder_rule_enabled",
  UPDATED: "products.reorder_rule_updated",
} as const;

export const BARCODE_EVENTS = {
  ADDED: "products.barcode_added",
  REMOVED: "products.barcode_removed",
} as const;

export const PRICE_LIST_EVENTS = {
  CREATED: "products.price_list_created",
  DISABLED: "products.price_list_disabled",
  ENABLED: "products.price_list_enabled",
  UPDATED: "products.price_list_updated",
} as const;

export const ITEM_PRICE_EVENTS = {
  CANCELLED: "products.item_price_cancelled",
  CREATED: "products.item_price_created",
  EXPIRED: "products.item_price_expired",
  UPDATED: "products.item_price_updated",
} as const;

export const events = {
  BARCODE_EVENTS,
  BRAND_EVENTS,
  ITEM_EVENTS,
  ITEM_GROUP_EVENTS,
  ITEM_PRICE_EVENTS,
  PRICE_LIST_EVENTS,
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

export interface ItemEnabledEvent {
  itemId: string;
}

export interface ItemArchivedEvent {
  itemId: string;
}

export interface ItemEventMap {
  [ITEM_EVENTS.ARCHIVED]: ItemArchivedEvent;
  [ITEM_EVENTS.CREATED]: ItemCreatedEvent;
  [ITEM_EVENTS.DISABLED]: ItemDisabledEvent;
  [ITEM_EVENTS.ENABLED]: ItemEnabledEvent;
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

export interface ItemGroupEnabledEvent {
  itemGroupId: string;
}

export interface ItemGroupEventMap {
  [ITEM_GROUP_EVENTS.CREATED]: ItemGroupCreatedEvent;
  [ITEM_GROUP_EVENTS.DISABLED]: ItemGroupDisabledEvent;
  [ITEM_GROUP_EVENTS.ENABLED]: ItemGroupEnabledEvent;
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

export interface VariantDisabledEvent {
  variantId: string;
}

export interface VariantEnabledEvent {
  variantId: string;
}

export interface VariantEventMap {
  [VARIANT_EVENTS.CREATED]: VariantCreatedEvent;
  [VARIANT_EVENTS.DISABLED]: VariantDisabledEvent;
  [VARIANT_EVENTS.ENABLED]: VariantEnabledEvent;
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

export interface ReorderRuleEnabledEvent {
  reorderRuleId: string;
}

export interface ReorderRuleEventMap {
  [REORDER_RULE_EVENTS.CREATED]: ReorderRuleCreatedEvent;
  [REORDER_RULE_EVENTS.DISABLED]: ReorderRuleDisabledEvent;
  [REORDER_RULE_EVENTS.ENABLED]: ReorderRuleEnabledEvent;
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

export interface PriceListCreatedEvent {
  priceList: { id: string; name: string };
}

export interface PriceListUpdatedEvent {
  changes: Record<string, JsonValue>;
  priceList: { id: string; name: string };
}

export interface PriceListDisabledEvent {
  priceListId: string;
}

export interface PriceListEnabledEvent {
  priceListId: string;
}

export interface PriceListEventMap {
  [PRICE_LIST_EVENTS.CREATED]: PriceListCreatedEvent;
  [PRICE_LIST_EVENTS.DISABLED]: PriceListDisabledEvent;
  [PRICE_LIST_EVENTS.ENABLED]: PriceListEnabledEvent;
  [PRICE_LIST_EVENTS.UPDATED]: PriceListUpdatedEvent;
}

export interface ItemPriceCreatedEvent {
  itemPrice: { id: string; itemId: string; priceListId: string };
}

export interface ItemPriceUpdatedEvent {
  changes: Record<string, JsonValue>;
  itemPrice: { id: string; itemId: string; priceListId: string };
}

export interface ItemPriceExpiredEvent {
  itemPriceId: string;
}

export interface ItemPriceCancelledEvent {
  itemPriceId: string;
}

export interface ItemPriceEventMap {
  [ITEM_PRICE_EVENTS.CANCELLED]: ItemPriceCancelledEvent;
  [ITEM_PRICE_EVENTS.CREATED]: ItemPriceCreatedEvent;
  [ITEM_PRICE_EVENTS.EXPIRED]: ItemPriceExpiredEvent;
  [ITEM_PRICE_EVENTS.UPDATED]: ItemPriceUpdatedEvent;
}

export type ProductsEventMap = BarcodeEventMap &
  BrandEventMap &
  ItemEventMap &
  ItemGroupEventMap &
  ItemPriceEventMap &
  PriceListEventMap &
  ReorderRuleEventMap &
  VariantEventMap;
