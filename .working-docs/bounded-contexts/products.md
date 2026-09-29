# Products Context

> Package: `@aspen-os/products`. Domain module for the centralized item master — items, groups, brands, manufacturers, attributes/variants, barcodes, alternatives, UOMs, reorder rules, settings, lookups, and price lists. Price lists live here (no separate pricelist package).

## Relationship Type

Downstream of the Platform (Customer–Supplier). Stateless — `$initialize()`, `$prepareRuntime()`, `$cleanup()` are all empty; no `$consumes` property at all; no schedules, no subscriptions. `$dependencies = []`.

## Structure (`packages/products/`)

- `Products.create()` — factory; no config
- `$name = "products"`, `$dependencies = []`
- 16 workflow groups exposed as `readonly`: `items` (18), `groups` (8), `brands` (5), `manufacturers` (8), `attributes` (9), `variants` (10), `barcodes` (3), `alternatives` (3), `itemUoms` (5), `reorderRules` (7), `settings` (2), `lookups` (5), `priceLists` (8), `itemPrices` (9), `priceFetch` (4), `pricelistSettings` (2) — 106 actions total
- 19 database tables (all `tenant_schemas`, `control_plane_schemas = {}`): `products_attribute`, `products_attribute_value`, `products_barcode`, `products_brand`, `products_item`, `products_item_alternative`, `products_item_customer_code`, `products_item_group`, `products_item_price`, `products_item_supplier_code`, `products_item_tax`, `products_item_uom`, `products_manufacturer`, `products_manufacturer_part`, `products_price_list`, `products_pricelist_setting`, `products_reorder_rule`, `products_setting`, `products_template_attribute` — plus 8 `products_*` pgEnums
- 29 domain events published via PubSub (`ProductsEventMap` across 8 `*_EVENTS` maps)
- 13 ACL resources via `defineAcl()`
- 15 services (`group-hierarchy`, `item-codes`, `item-eligibility`, `item-fields`, `item-invariants`, `item-text`, `lifecycle`, `pricing-*` ×6, `singleton`, `variant-values`) + `workflow-steps/fetch.ts`

## Exposed on the platform instance

```
p.products.items             { archive, create, delete, disable, enable, get, list, markTransacted, update,
                               addCustomerCode, listCustomerCodes, removeCustomerCode, addSupplierCode,
                               listSupplierCodes, removeSupplierCode, addTax, listTaxes, removeTax }
p.products.groups            { create, delete, disable, enable, get, list, tree, update }
p.products.brands            { create, delete, get, list, update }
p.products.manufacturers     { create, delete, get, list, update, addPart, listParts, removePart }
p.products.attributes        { create, delete, get, list, update, addValue, listValues, removeValue, updateValue }
p.products.variants          { create, createCombinations, disable, enable, get, list, syncFromTemplate,
                               addTemplateAttribute, listTemplateAttributes, removeTemplateAttribute }
p.products.barcodes          { add, list, remove }
p.products.alternatives      { add, list, remove }
p.products.itemUoms          { add, list, recalculate, remove, update }
p.products.reorderRules      { create, delete, disable, enable, get, list, update }
p.products.settings          { get, update }
p.products.lookups           { getByBarcode, getByCode, getReorderRules, listByGroup, resolveDefaults }
p.products.priceLists        { create, delete, disable, enable, get, list, seed, update }
p.products.itemPrices        { assignToParties, cancel, create, delete, expire, get, hasReferences, list, update }
p.products.priceFetch        { getActiveForItem, getExpiring, getRate, getRatesForList }
p.products.pricelistSettings { get, update }
```

## Cross-context integration

- **Upstream of inventory**: `inventory.$dependencies = ["masters", "products"]`; inventory reorder scan reads `products_reorder_rule` (non-disabled) via soft FK; inventory keeps item/price snapshots, never local masters.
- Docs note introspection-only awareness of `masters.unit_of_measure_*`, `masters.contact_*`, `inventory.stock_changed` — no `$consumes`, no subscriptions.
- `PRICELIST_SPEC.md` at repo root holds the full pricing contract.

## Language

- Item, Item Group, Brand, Manufacturer, Attribute, Variant, Barcode, Alternative, Item UOM, Reorder Rule, Price List, Item Price
- Avoid: separate Pricelist package (rates live here); Product (use Item); SKU (use itemCode)
