import { addAlternative } from "#/workflows/alternative/add";
import { listAlternatives } from "#/workflows/alternative/list";
import { removeAlternative } from "#/workflows/alternative/remove";
import { createAttribute } from "#/workflows/attribute/create";
import { deleteAttribute } from "#/workflows/attribute/delete";
import { getAttribute } from "#/workflows/attribute/get";
import { listAttributes } from "#/workflows/attribute/list";
import { updateAttribute } from "#/workflows/attribute/update";
import { addAttributeValue } from "#/workflows/attribute/value/add";
import { listAttributeValues } from "#/workflows/attribute/value/list";
import { removeAttributeValue } from "#/workflows/attribute/value/remove";
import { updateAttributeValue } from "#/workflows/attribute/value/update";
import { addBarcode } from "#/workflows/barcode/add";
import { listBarcodes } from "#/workflows/barcode/list";
import { removeBarcode } from "#/workflows/barcode/remove";
import { createBrand } from "#/workflows/brand/create";
import { deleteBrand } from "#/workflows/brand/delete";
import { getBrand } from "#/workflows/brand/get";
import { listBrands } from "#/workflows/brand/list";
import { updateBrand } from "#/workflows/brand/update";
import { createGroup } from "#/workflows/group/create";
import { deleteGroup } from "#/workflows/group/delete";
import { disableGroup } from "#/workflows/group/disable";
import { enableGroup } from "#/workflows/group/enable";
import { getGroup } from "#/workflows/group/get";
import { listGroups } from "#/workflows/group/list";
import { getGroupTree } from "#/workflows/group/tree";
import { updateGroup } from "#/workflows/group/update";
import { assignItemPriceToParties } from "#/workflows/item-price/assign-to-parties";
import { cancelItemPrice } from "#/workflows/item-price/cancel";
import { createItemPrice } from "#/workflows/item-price/create";
import { deleteItemPrice } from "#/workflows/item-price/delete";
import { expireItemPrice } from "#/workflows/item-price/expire";
import { getItemPrice } from "#/workflows/item-price/get";
import { hasPriceReferences } from "#/workflows/item-price/has-references";
import { listItemPrices } from "#/workflows/item-price/list";
import { updateItemPrice } from "#/workflows/item-price/update";
import { addItemUom } from "#/workflows/item-uom/add";
import { listItemUoms } from "#/workflows/item-uom/list";
import { recalculateItemUom } from "#/workflows/item-uom/recalculate";
import { removeItemUom } from "#/workflows/item-uom/remove";
import { updateItemUom } from "#/workflows/item-uom/update";
import { archiveItem } from "#/workflows/item/archive";
import { createItem } from "#/workflows/item/create";
import { addCustomerCode } from "#/workflows/item/customer-code/add";
import { listCustomerCodes } from "#/workflows/item/customer-code/list";
import { removeCustomerCode } from "#/workflows/item/customer-code/remove";
import { deleteItem } from "#/workflows/item/delete";
import { disableItem } from "#/workflows/item/disable";
import { enableItem } from "#/workflows/item/enable";
import { getItem } from "#/workflows/item/get";
import { listItems } from "#/workflows/item/list";
import { markItemTransacted } from "#/workflows/item/mark-transacted";
import { addSupplierCode } from "#/workflows/item/supplier-code/add";
import { listSupplierCodes } from "#/workflows/item/supplier-code/list";
import { removeSupplierCode } from "#/workflows/item/supplier-code/remove";
import { addItemTax } from "#/workflows/item/tax/add";
import { listItemTaxes } from "#/workflows/item/tax/list";
import { removeItemTax } from "#/workflows/item/tax/remove";
import { updateItem } from "#/workflows/item/update";
import { getByBarcode } from "#/workflows/lookup/get-by-barcode";
import { getByCode } from "#/workflows/lookup/get-by-code";
import { getReorderRules } from "#/workflows/lookup/get-reorder-rules";
import { listByGroup } from "#/workflows/lookup/list-by-group";
import { resolveDefaults } from "#/workflows/lookup/resolve-defaults";
import { createManufacturer } from "#/workflows/manufacturer/create";
import { deleteManufacturer } from "#/workflows/manufacturer/delete";
import { getManufacturer } from "#/workflows/manufacturer/get";
import { listManufacturers } from "#/workflows/manufacturer/list";
import { addManufacturerPart } from "#/workflows/manufacturer/part/add";
import { listManufacturerParts } from "#/workflows/manufacturer/part/list";
import { removeManufacturerPart } from "#/workflows/manufacturer/part/remove";
import { updateManufacturer } from "#/workflows/manufacturer/update";
import { getActiveForItem } from "#/workflows/price-fetch/get-active-for-item";
import { getExpiringPrices } from "#/workflows/price-fetch/get-expiring";
import { getRate } from "#/workflows/price-fetch/get-rate";
import { getRatesForList } from "#/workflows/price-fetch/get-rates-for-list";
import { createPriceList } from "#/workflows/price-list/create";
import { deletePriceList } from "#/workflows/price-list/delete";
import { disablePriceList } from "#/workflows/price-list/disable";
import { enablePriceList } from "#/workflows/price-list/enable";
import { getPriceList } from "#/workflows/price-list/get";
import { listPriceLists } from "#/workflows/price-list/list";
import { seedPriceLists } from "#/workflows/price-list/seed";
import { updatePriceList } from "#/workflows/price-list/update";
import { getPricelistSettingsWorkflow } from "#/workflows/pricelist-setting/get";
import { updatePricelistSettings } from "#/workflows/pricelist-setting/update";
import { createReorderRule } from "#/workflows/reorder-rule/create";
import { deleteReorderRule } from "#/workflows/reorder-rule/delete";
import { disableReorderRule } from "#/workflows/reorder-rule/disable";
import { enableReorderRule } from "#/workflows/reorder-rule/enable";
import { getReorderRule } from "#/workflows/reorder-rule/get";
import { listReorderRules } from "#/workflows/reorder-rule/list";
import { updateReorderRule } from "#/workflows/reorder-rule/update";
import { getSettings } from "#/workflows/setting/get";
import { updateSettings } from "#/workflows/setting/update";
import { createVariant } from "#/workflows/variant/create";
import { createVariantCombinations } from "#/workflows/variant/create-combinations";
import { disableVariant } from "#/workflows/variant/disable";
import { enableVariant } from "#/workflows/variant/enable";
import { getVariant } from "#/workflows/variant/get";
import { listVariants } from "#/workflows/variant/list";
import { syncVariantFromTemplate } from "#/workflows/variant/sync-from-template";
import { addTemplateAttribute } from "#/workflows/variant/template-attribute/add";
import { listTemplateAttributes } from "#/workflows/variant/template-attribute/list";
import { removeTemplateAttribute } from "#/workflows/variant/template-attribute/remove";

export const items = {
  addCustomerCode,
  addSupplierCode,
  addTax: addItemTax,
  archive: archiveItem,
  create: createItem,
  delete: deleteItem,
  disable: disableItem,
  enable: enableItem,
  get: getItem,
  list: listItems,
  listCustomerCodes,
  listSupplierCodes,
  listTaxes: listItemTaxes,
  markTransacted: markItemTransacted,
  removeCustomerCode,
  removeSupplierCode,
  removeTax: removeItemTax,
  update: updateItem,
} as const;

export const groups = {
  create: createGroup,
  delete: deleteGroup,
  disable: disableGroup,
  enable: enableGroup,
  get: getGroup,
  list: listGroups,
  tree: getGroupTree,
  update: updateGroup,
} as const;

export const brands = {
  create: createBrand,
  delete: deleteBrand,
  get: getBrand,
  list: listBrands,
  update: updateBrand,
} as const;

export const manufacturers = {
  addPart: addManufacturerPart,
  create: createManufacturer,
  delete: deleteManufacturer,
  get: getManufacturer,
  list: listManufacturers,
  listParts: listManufacturerParts,
  removePart: removeManufacturerPart,
  update: updateManufacturer,
} as const;

export const attributes = {
  addValue: addAttributeValue,
  create: createAttribute,
  delete: deleteAttribute,
  get: getAttribute,
  list: listAttributes,
  listValues: listAttributeValues,
  removeValue: removeAttributeValue,
  update: updateAttribute,
  updateValue: updateAttributeValue,
} as const;

export const variants = {
  addTemplateAttribute,
  create: createVariant,
  createCombinations: createVariantCombinations,
  disable: disableVariant,
  enable: enableVariant,
  get: getVariant,
  list: listVariants,
  listTemplateAttributes,
  removeTemplateAttribute,
  syncFromTemplate: syncVariantFromTemplate,
} as const;

export const barcodes = {
  add: addBarcode,
  list: listBarcodes,
  remove: removeBarcode,
} as const;

export const alternatives = {
  add: addAlternative,
  list: listAlternatives,
  remove: removeAlternative,
} as const;

export const itemUoms = {
  add: addItemUom,
  list: listItemUoms,
  recalculate: recalculateItemUom,
  remove: removeItemUom,
  update: updateItemUom,
} as const;

export const reorderRules = {
  create: createReorderRule,
  delete: deleteReorderRule,
  disable: disableReorderRule,
  enable: enableReorderRule,
  get: getReorderRule,
  list: listReorderRules,
  update: updateReorderRule,
} as const;

export const settings = {
  get: getSettings,
  update: updateSettings,
} as const;

export const priceLists = {
  create: createPriceList,
  delete: deletePriceList,
  disable: disablePriceList,
  enable: enablePriceList,
  get: getPriceList,
  list: listPriceLists,
  seed: seedPriceLists,
  update: updatePriceList,
} as const;

export const itemPrices = {
  assignToParties: assignItemPriceToParties,
  cancel: cancelItemPrice,
  create: createItemPrice,
  delete: deleteItemPrice,
  expire: expireItemPrice,
  get: getItemPrice,
  hasReferences: hasPriceReferences,
  list: listItemPrices,
  update: updateItemPrice,
} as const;

export const priceFetch = {
  getActiveForItem,
  getExpiring: getExpiringPrices,
  getRate,
  getRatesForList,
} as const;

export const pricelistSettings = {
  get: getPricelistSettingsWorkflow,
  update: updatePricelistSettings,
} as const;

export const lookups = {
  getByBarcode,
  getByCode,
  getReorderRules,
  listByGroup,
  resolveDefaults,
} as const;
