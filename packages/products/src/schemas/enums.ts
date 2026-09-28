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

import { picklist } from "valibot";

export const ItemStatusSchema = picklist(Object.values(ITEM_STATUS));

export const NamingModeSchema = picklist(Object.values(NAMING_MODE));

export const ValuationMethodSchema = picklist(Object.values(VALUATION_METHOD));

export const MaterialRequestTypeSchema = picklist(Object.values(MATERIAL_REQUEST_TYPE));

export const BarcodeTypeSchema = picklist(Object.values(BARCODE_TYPE));

export const VariantBasedOnSchema = picklist(Object.values(VARIANT_BASED_ON));

export const PriceListApplicabilitySchema = picklist(Object.values(PRICE_LIST_APPLICABILITY));

export const ItemPriceStatusSchema = picklist(Object.values(ITEM_PRICE_STATUS));

export {
  BARCODE_TYPE,
  ITEM_PRICE_STATUS,
  ITEM_STATUS,
  MATERIAL_REQUEST_TYPE,
  NAMING_MODE,
  PRICE_LIST_APPLICABILITY,
  VALUATION_METHOD,
  VARIANT_BASED_ON,
};
