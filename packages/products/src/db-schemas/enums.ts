import {
  BARCODE_TYPE,
  ITEM_PRICE_STATUS,
  ITEM_STATUS,
  MATERIAL_REQUEST_TYPE,
  NAMING_MODE,
  PRICE_LIST_APPLICABILITY,
  VALUATION_METHOD,
  VARIANT_BASED_ON,
} from "#/utils/constants";

import { pgEnum } from "drizzle-orm/pg-core";

export const productsItemStatusEnum = pgEnum("products_item_status", [
  ITEM_STATUS.ACTIVE,
  ITEM_STATUS.DISABLED,
  ITEM_STATUS.ARCHIVED,
]);

export const productsNamingModeEnum = pgEnum("products_naming_mode", [
  NAMING_MODE.ITEM_CODE,
  NAMING_MODE.NAMING_SERIES,
]);

export const productsValuationMethodEnum = pgEnum("products_valuation_method", [
  VALUATION_METHOD.FIFO,
  VALUATION_METHOD.MOVING_AVERAGE,
]);
// Single owner of the method declaration: products declares the per-item
// valuation_method (products_item.valuation_method, nullable → inventory
// fallback). Inventory owns the engine (posting/pricing.ts, stock-math.ts)
// and the global default (inventory_setting.default_valuation_method).
// Keep values in sync with inventory VALUATION_METHOD; PG types stay
// separate because packages cannot share DB enums.

export const productsMaterialRequestTypeEnum = pgEnum("products_material_request_type", [
  MATERIAL_REQUEST_TYPE.MANUFACTURE,
  MATERIAL_REQUEST_TYPE.PURCHASE,
  MATERIAL_REQUEST_TYPE.TRANSFER,
]);

export const productsBarcodeTypeEnum = pgEnum("products_barcode_type", [
  BARCODE_TYPE.EAN,
  BARCODE_TYPE.OTHER,
  BARCODE_TYPE.UPC,
]);

export const productsVariantBasedOnEnum = pgEnum("products_variant_based_on", [
  VARIANT_BASED_ON.ATTRIBUTE,
  VARIANT_BASED_ON.MANUFACTURER,
]);

export const productsPriceListApplicabilityEnum = pgEnum("products_price_list_applicability", [
  PRICE_LIST_APPLICABILITY.BOTH,
  PRICE_LIST_APPLICABILITY.BUYING,
  PRICE_LIST_APPLICABILITY.SELLING,
]);

export const productsItemPriceStatusEnum = pgEnum("products_item_price_status", [
  ITEM_PRICE_STATUS.ACTIVE,
  ITEM_PRICE_STATUS.CANCELLED,
  ITEM_PRICE_STATUS.DRAFT,
  ITEM_PRICE_STATUS.EXPIRED,
]);
