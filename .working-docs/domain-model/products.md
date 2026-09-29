# Products Domain Model

> Package: `@aspen-os/products`. Centralized item master — items, groups, brands, manufacturers, attributes/variants, barcodes, alternatives, UOMs, reorder rules, settings, lookups, and price lists/item prices. All 19 tables are tenant schemas (`products_` prefix). Stateless: no `$consumes`, no runtime subscriptions, no cron. Reorder scan lives in inventory (`inventory.reorder-scan` reads `products_reorder_rule`).

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTS DOMAIN                               │
│                                                                      │
│  ┌──────────────┐   1:N ┌──────────────┐                             │
│  │  ItemGroup   │──────→│     Item     │──1:N──┌──────────────┐       │
│  │  tree        │       │  code (uniq) │      │  ItemUom     │       │
│  │  is_group    │       │  status      │      │  conversion  │       │
│  └──────────────┘       │  valuation   │      └──────────────┘       │
│         ▲               │  template?   │──1:N──┌──────────────┐       │
│         │               └──────┬───────┘      │  Barcode     │       │
│         │                      │              └──────────────┘       │
│  ┌──────────────┐              │ variantOf    ┌──────────────┐       │
│  │    Brand     │──N:1──┘      ├──────────────→│   Variant    │       │
│  └──────────────┘              │ (template +  │ (same table) │       │
│  ┌──────────────┐              │  variantKey) └──────────────┘       │
│  │ Manufacturer │──N:1──┘      │                                     │
│  │  + Part refs │              ├─1:N── Alternative / CustomerCode /   │
│  └──────────────┘              │       SupplierCode / ItemTax         │
│  ┌──────────────┐              │                                     │
│  │  Attribute   │──1:N── AttributeValue                               │
│  │  + TemplateAttribute (per-template allowlist)                     │
│  └──────────────┘                                                   │
│  ┌──────────────┐   1:N ┌──────────────┐                             │
│  │  PriceList   │──────→│  ItemPrice   │ (buying/selling/both,        │
│  │  selling?    │       │  rate/validity│  draft/active/expired/       │
│  │  buying?     │       │  status      │  cancelled)                  │
│  └──────────────┘       └──────────────┘                             │
│  ┌──────────────┐       ┌──────────────┐                             │
│  │ ReorderRule  │       │   Setting    │ (singletons incl. pricelist  │
│  │  level/qty   │       │  auto-insert │  settings)                   │
│  └──────────────┘       └──────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Item (Aggregate Root)

**Identity**: `id` (text, UUID via `uuidv7`); `itemCode` unique.

**Value objects**: `ItemStatus` (active/disabled/archived), `NamingMode` (item_code/naming_series), `ValuationMethod` (fifo/moving_average), `VariantBasedOn` (attribute/manufacturer).

**Invariants**:

- Groups form a tree (`parent_id` + `is_group`); only leaves hold stock (enforced in inventory).
- `has_transactions` / `last_purchase_rate` maintained by price-fetch writes.
- Archive/disabled blocks new movements; transacted items cannot be deleted.
- Variants share template (`templateItemId` + `variantKey`); `syncFromTemplate` propagates allowlisted fields; `createCombinations` generates cartesian variants.

**Lifecycle commands** (via `p.products.items`, 18): `create/get/list/update/archive/delete/disable/enable/markTransacted` + customer/supplier-code and tax add/list/remove.

### Group / Brand / Manufacturer

Groups (8): `create/get/list/tree/update/disable/enable/delete`. Brands (5): `create/get/list/update/delete`. Manufacturers (8): `create/get/list/update/delete` + part `add/list/remove`.

### Attribute / Variant

Attributes (9): `create/get/list/update/delete` + value `add/list/remove/update`. Variants (10): `create/get/list/disable/enable/createCombinations/syncFromTemplate` + template-attribute `add/list/remove`.

### UOM / Barcode / Alternative

`itemUoms` (5): `add/list/update/remove/recalculate`. `barcodes` (3): `add/list/remove`. `alternatives` (3): `add/list/remove`.

### Reorder Rule / Settings / Lookups

`reorderRules` (7): `create/get/list/update/delete/disable/enable`. `settings` (2): `get/update`. `lookups` (5, read-only): `getByBarcode/getByCode/getReorderRules/listByGroup/resolveDefaults`.

### PriceList / ItemPrice / PriceFetch

`priceLists` (8): `create/get/list/update/delete/disable/enable/seed`. `itemPrices` (9): `create/get/list/update/delete/cancel/expire/assignToParties/hasReferences`. `priceFetch` (4, read-only): `getRate/getRatesForList/getActiveForItem/getExpiring`. `pricelistSettings` (2): `get/update`.

## Domain Events — 29

Items (5): `products.item_created/_updated/_disabled/_enabled/_archived`. Groups (4): `item_group_created/_updated/_disabled/_enabled`. Brands (2): `brand_created/_updated`. Variants (4): `variant_created/_disabled/_enabled/_template_updated`. Reorder rules (4): `reorder_rule_created/_updated/_disabled/_enabled`. Barcodes (2): `barcode_added/_removed`. Price lists (4): `price_list_created/_updated/_disabled/_enabled`. Item prices (4): `item_price_created/_updated/_expired/_cancelled`.

No `$consumes` in code (stateless). Docs note introspection-only awareness of `masters.unit_of_measure_*`, `masters.contact_*`, `inventory.stock_changed` — no subscriptions.

## Command-Query Separation

| Context  | Command              | Method                                     |
| -------- | -------------------- | ------------------------------------------ |
| Products | Create item          | `p.products.items.create()`                |
| Products | Create variant combo | `p.products.variants.createCombinations()` |
| Products | Create price list    | `p.products.priceLists.create()`           |
| Products | Create item price    | `p.products.itemPrices.create()`           |
| Products | Create reorder rule  | `p.products.reorderRules.create()`         |

| Context  | Query             | Method                                 |
| -------- | ----------------- | -------------------------------------- |
| Products | Get rate          | `p.products.priceFetch.getRate()`      |
| Products | Resolve defaults  | `p.products.lookups.resolveDefaults()` |
| Products | Get reorder rules | `p.products.lookups.getReorderRules()` |
| Products | List by group     | `p.products.lookups.listByGroup()`     |

## Invariants & Business Rules

6. **Single item master** — inventory/accounting keep soft FKs + snapshots, never local item definitions.
7. **Price lists live here** — no separate pricelist package; rates soft-FK to items; UOM validation reuses `products_item_uom`.
8. **Transacted guard** — items with ledger postings cannot be deleted (disable/archive instead).
9. **Variant sync allowlist** — only `VARIANT_SYNC_ALLOWLIST` fields propagate from template.
10. **Auto-insert pricing** — `products_setting.auto_insert_price_if_missing` controls fetch-time price creation.
