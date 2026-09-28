import {
  BARCODE_TYPE,
  ITEM_STATUS,
  MATERIAL_REQUEST_TYPE,
  NAMING_MODE,
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
