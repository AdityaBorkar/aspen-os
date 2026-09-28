import { productsAttribute } from "#/db-schemas/attribute";
import { productsAttributeValue } from "#/db-schemas/attribute-value";
import { productsBarcode } from "#/db-schemas/barcode";
import { productsBrand } from "#/db-schemas/brand";
import {
  productsBarcodeTypeEnum,
  productsItemStatusEnum,
  productsMaterialRequestTypeEnum,
  productsNamingModeEnum,
  productsValuationMethodEnum,
  productsVariantBasedOnEnum,
} from "#/db-schemas/enums";
import { productsItem } from "#/db-schemas/item";
import { productsItemAlternative } from "#/db-schemas/item-alternative";
import { productsItemCustomerCode } from "#/db-schemas/item-customer-code";
import { productsItemGroup } from "#/db-schemas/item-group";
import { productsItemSupplierCode } from "#/db-schemas/item-supplier-code";
import { productsItemTax } from "#/db-schemas/item-tax";
import { productsItemUom } from "#/db-schemas/item-uom";
import { productsManufacturer } from "#/db-schemas/manufacturer";
import { productsManufacturerPart } from "#/db-schemas/manufacturer-part";
import { productsReorderRule } from "#/db-schemas/reorder-rule";
import { productsSetting } from "#/db-schemas/setting";
import { productsTemplateAttribute } from "#/db-schemas/template-attribute";

export { productsAttribute } from "#/db-schemas/attribute";
export { productsAttributeValue } from "#/db-schemas/attribute-value";
export { productsBarcode } from "#/db-schemas/barcode";
export { productsBrand } from "#/db-schemas/brand";
export {
  productsBarcodeTypeEnum,
  productsItemStatusEnum,
  productsMaterialRequestTypeEnum,
  productsNamingModeEnum,
  productsValuationMethodEnum,
  productsVariantBasedOnEnum,
} from "#/db-schemas/enums";
export { productsItem } from "#/db-schemas/item";
export { productsItemAlternative } from "#/db-schemas/item-alternative";
export { productsItemCustomerCode } from "#/db-schemas/item-customer-code";
export { productsItemGroup } from "#/db-schemas/item-group";
export { productsItemSupplierCode } from "#/db-schemas/item-supplier-code";
export { productsItemTax } from "#/db-schemas/item-tax";
export { productsItemUom } from "#/db-schemas/item-uom";
export { productsManufacturer } from "#/db-schemas/manufacturer";
export { productsManufacturerPart } from "#/db-schemas/manufacturer-part";
export { productsReorderRule } from "#/db-schemas/reorder-rule";
export { productsSetting } from "#/db-schemas/setting";
export { productsTemplateAttribute } from "#/db-schemas/template-attribute";

export const productsTables = {
  productsAttribute,
  productsAttributeValue,
  productsBarcode,
  productsBarcodeTypeEnum,
  productsBrand,
  productsItem,
  productsItemAlternative,
  productsItemCustomerCode,
  productsItemGroup,
  productsItemStatusEnum,
  productsItemSupplierCode,
  productsItemTax,
  productsItemUom,
  productsManufacturer,
  productsManufacturerPart,
  productsMaterialRequestTypeEnum,
  productsNamingModeEnum,
  productsReorderRule,
  productsSetting,
  productsTemplateAttribute,
  productsValuationMethodEnum,
  productsVariantBasedOnEnum,
} as const;

export const control_plane_schemas = {} as const;

export const tenant_schemas = productsTables;
