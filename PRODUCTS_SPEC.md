# Products Spec — `@aspen-os/products`

Status: draft · Module: `@aspen-os/products` (`$name = "products"`) · All tables tenant-scope, `products_` prefix
Sources (analyzed):

- https://frappe.io/erpnext/open-source-inventory-management-system (§1 Centralized item master)
- Supporting detail: https://docs.frappe.io/erpnext/item, `/item-group`, `/item-variants`, `/item-attribute`, `/item-codification`, `/track-items-using-barcode`, `/uom`, `/selling-in-different-uom`, `/manufacturer`, `/brand`

## 1. Goals / non-goals

Goals: single source of truth for every sellable, purchasable, stockable, or service thing the tenant offers — goods and services, raw materials, sub-assemblies, finished goods, subcontracted items, and fixed-asset items — with grouping, variants, barcodes, multi-UOM, and reorder defaults. All stock/price/order modules reference this master by soft-FK; nothing duplicates it.

Non-goals (no tables, workflows, events, or reports for these):

1. Price Lists and Item Prices (owned by `@aspen-os/pricelist`; products stores only `standard_selling_rate` seed + `last_purchase_rate` cache — see `PRICELIST_SPEC.md`).
2. Warehouses, stock ledger, valuation, reservations, putaway/pick (owned by `@aspen-os/inventory` — see `INVENTORY_SPEC.md`).
3. Stock Reports of any kind (skipped globally per instruction).
4. Website/hub publishing (Website Item, slideshows, meta tags, hub sync). No website module exists in Aspen OS; carry nothing for storefront in v1.
5. Manufacturing structures (BOM, Work Order) and accounting postings (GL, tax ledgers, cost centers). Products carries only `default_bom_id` / `default_expense_account` / `default_income_account` as opaque soft-FK labels.

## 2. Ubiquitous language (Aspen OS mapping)

| Term                 | Meaning in this module                                                                                                                                                             | Avoid / maps to                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Product == Item      | Any good or service: finished good, raw material, sub-assembly, service, subcontracted, customer-provided, fixed asset. `Item Code`/`Item Name` kept as ERPNext-compat field names | SKU-only thinking (services are items too) |
| Item Group           | Tree classifier (`All Item Groups` root; group nodes organize, leaf-equivalents hold items). Replaces ERPNext "category"                                                           | Category (use Item Group)                  |
| Template / Variant   | Template (`has_variants=true`) defines attribute axes; only Variants transact. Manufacturer-based variants also supported                                                          | Child item, sub-item                       |
| Attribute            | Variant axis (color/size/…) with discrete or numeric-range values                                                                                                                  | Option, property                           |
| UOM                  | Owned by `masters.unitsOfMeasure`; products stores per-item default + alternate conversion rows, never UOM defs                                                                    | Local UOM                                  |
| Brand / Manufacturer | Lookup + part-number mapping for sourcing/sales identity                                                                                                                           | Vendor as brand                            |
| Barcode              | Scannable identity (`EAN-13`/`UPC` + generic); one item may carry many                                                                                                             | SKU as barcode                             |
| Reorder defaults     | Per (`item_id`, warehouse-group) `reorder_level/qty` consumed by inventory's reorder scan                                                                                          | Min-stock (use reorder level)              |

## 3. Functional scope (ERPNext-parity minus §1 exclusions)

### 3.1 Item master (goods + services)

- **F1 — Item core + naming.** Fields: `item_code` (unique; manual code or `naming_series`-generated per settings), `item_name` (defaults to code), `item_group_id` (soft-FK), `brand_id?`, `description?` (cleaned HTML per settings), `image_file_id?` (soft-FK to dms), `is_disabled`, `is_stock_item` (`Maintain Stock`: ledger-tracked vs service/make-to-order), `is_sales_item`, `is_purchase_item`, `is_fixed_asset` + `auto_create_assets_on_purchase?`, `include_in_manufacturing?`, `is_customer_provided?` (+ `default_customer_id?` soft-FK to masters Entity), `end_of_life_date?` (blocks transactions after), `shelf_life_days?` (batch default), `warranty_days?` (requires serial — see F5), `weight_uom?` + `weight_per_unit?`, `allow_negative_stock?` (per-item override), `valuation_method?` (`fifo|moving_average`, locked after first ledger entry), `allowance_percent?` (over-deliver/receive fallback to settings), `lead_time_days?`, `minimum_order_qty?`, `safety_stock?`, `is_nil_rated_or_exempt?`, `is_non_gst?` (generic tax-exempt flags; no jurisdiction logic), `hsn_sac?` (opaque code label). Rules: `item_code` immutable after first transaction; toggling `has_serial_no`/`has_batch_no`/`has_variants` blocked after first transaction; disabled items unselectable in all transactions; service items (`is_stock_item=false`) rejected by inventory movement validation.
- **F2 — Item naming + codification.** Settings `item_naming_by: item_code|naming_series`; optional prefix/series per group; duplicate-name guard via code uniqueness (names may repeat, codes never). Import/migrate catalogue before opening stock; verify via draft quotation/order preview (accounting) without posting.
- **F3 — Item defaults (per-company rows, v1 single-tenant single row).** `default_warehouse_id?` (soft-FK to inventory), `default_price_list?` (soft-FK label to pricelist), `default_supplier_id?` (soft-FK to masters Entity), `default_expense_account` / `default_income_account` / `default_cost_center` (opaque labels owned by accounting), `default_material_request_type?`. Group-level defaults (see F7) cascade: item overrides group overrides settings.
- **F4 — Sales / purchase / replenishment facets.** Sales: `default_sales_uom`, `max_discount_percent?`, `grant_commission?`. Purchase: `default_purchase_uom`, `delivered_by_supplier_drop_ship?`, `inspection_required_before_purchase?` / `before_delivery?` + `quality_inspection_template?` (opaque flags), `country_of_origin?`, `customs_tariff_no?` (opaque labels). Replenishment: `default_material_request_type`, auto-reorder rows (§3.4). Deferred revenue/expense: `enable_deferred_revenue?`/`enable_deferred_expense?` + `deferred_account` label + `deferral_months?` (accounting consumes). Customer/supplier part codes: `supplier_part_nos[]` (`supplier_id`, `supplier_part_no`), `customer_ref_codes[]` (`customer_id`, `ref_code`) for document print/fetch.
- **F5 — Serial / batch / inspection flags (behavior owned by inventory).** `has_serial_no` + `serial_number_series?`, `has_batch_no` + `batch_number_series?` + `auto_create_batch?` + `has_expiry_date?` + `retain_sample?`, `inspection_required_*` + template label. Products validates flag coherence (e.g. warranty requires serial; expiry requires batch) and locks flags after first movement; inventory enforces per-movement serial/batch capture.

### 3.2 Grouping, brands, manufacturers

- **F6 — Brand + Manufacturer lookups.** `products_brand` (`name` unique, `description?`, `image_file_id?`), `products_manufacturer` (`name` unique, `website?`, `country?`) + `products_manufacturer_part` (`item_id`, `manufacturer_id`, `manufacturer_part_no`). Deletion blocked while referenced by items/variants.
- **F7 — Item Group tree.** Fields: `name` (unique among siblings), `parent_id?`, `is_group`, `weightage?` (sort hint only — no storefront use in v1), `show_in_website?` (stored, ignored — website excluded), `default_warehouse_id?`, `default_price_list?`, `default_supplier_id?`, `default_expense_account`/`default_income_account`/`default_cost_center` (opaque), `default_item_tax_template?` + `tax_category?` (opaque labels owned by accounting). Rules mirror warehouse tree: group never directly holds items for defaulting ambiguity (items attach anywhere, defaults resolve nearest-ancestor); rename/reparent allowed; delete blocked with child groups or linked items.
- **F8 — Alternative items.** `products_item_alternative` (`item_id`, `alternative_item_id`, `is_two_way?`) for manufacturing substitution when primary material unavailable. No auto-substitution in v1 (manual select in Stock Entry/MR).

### 3.3 Units, barcodes, taxes

- **F9 — Multiple UOMs per item.** `default_uom` (masters-validated) + `products_item_uom` rows (`uom`, `conversion_factor` to stock UOM, `must_be_whole_number?`). Sales/purchase transactions may use any listed UOM; when `uom_restrict_to_item_conversions` setting is on, unlisted UOMs are rejected. Conversion-factor edits after first transaction require explicit `recalculate` action (no silent revaluation; inventory ledger history immutable).
- **F10 — Barcodes.** `products_barcode` (`item_id`, `barcode` unique, `barcode_type: ean|upc|other`, `uom?`). Scan-to-add supported by inventory reconciliation/pick and accounting order rows via `getItemByBarcode` query. `show_barcode_field` setting gates UI affordance only.
- **F11 — Item tax + HSN/SAC (labels only).** `products_item_tax` (`item_id`, `tax_template?` label, `tax_rate_override?`) + `tax_category?`. No tax computation here — accounting applies templates at invoice time; products only stores per-item overrides.

### 3.4 Variants + auto-reorder

- **F12 — Attributes, templates, variants.** `products_attribute` (`name` unique, `is_numeric?`, `unit?`) + values (`attribute_id`, `value`, `sort_order?`; numeric attributes support `range_low/high + increment`). Template item (`has_variants=true`, `variant_based_on: attribute|manufacturer`) declares `products_template_attribute` (`attribute_id`, `is_required?`); template itself never transacts. `Create Variants` (single or multi-combination explosion, e.g. 2 colors × 3 sizes = 6) generates variant items (`template_item_id` soft-FK, `variant_key` deterministic); `Item Variant Settings` allowlist controls which template field edits propagate to variants (explicit `sync_from_template` action, never silent mass-update). Manufacturer-based variants (`manufacturer_id` + `manufacturer_part_no`) supported.
- **F13 — Auto-reorder rows.** `products_reorder_rule` (`item_id`, `check_in_group_id` (warehouse group soft-FK), `request_for_warehouse_id`, `reorder_level`, `reorder_qty`, `material_request_type`). Evaluated by inventory `reorder-scan` at midnight (or on `inventory.stock_changed` hint); raises `inventory.reorder_triggered`. `Request for` warehouse may differ from checked group (transfer-type rules).

### 3.5 Settings owned here

- **F14 — Owned settings.** Singleton `products_setting`: `item_naming_by`, `default_item_group_id?`, `default_stock_uom` (label), `default_warehouse_id?` (soft-FK), `default_valuation_method`, `limit_percent`, `over_deliver_receive_role?`, `show_barcode_field?`, `clean_description_html?`, `auto_insert_price_if_missing?` (delegated: pricelist executes, flag lives here for ERPNext parity — or mirrored in pricelist settings; v1 single flag in products, consumed by pricelist), `allow_negative_stock?`, `serial_batch_enabled?`, `batch_naming_series?`, `sample_retention_warehouse_id?`. Everything else by reference: UOM defs (masters), warehouses (inventory), price lists (pricelist), tax templates (accounting).

## 4. Document lifecycles

| Entity                                        | Draft → …                                                                                              | Effect                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Item                                          | `draft? → active → disabled \| archived` (v1: `active ↔ disabled`; delete only when zero transactions) | Disabled blocks all new transaction rows; never deletes history |
| Item Group / Brand / Manufacturer / Attribute | `active ↔ disabled`; delete only when unreferenced                                                     | Reparent/rename safe; defaults re-resolve on next transaction   |
| Variant                                       | `created → active ↔ disabled` (bound to template lifecycle)                                            | Only variants transact; template direct-use rejected            |
| Reorder rule                                  | `active ↔ disabled`                                                                                    | Drives inventory scan; no direct stock effect                   |

Invariants: codes unique; template never transacts; serial/batch/variant flags locked after first movement; disabled entities unselectable but history preserved; factor/rate edits never rewrite ledger history.

## 5. Domain events (`products.*`)

Produced (type-level contract; platform has no runtime side effects): `products.item_created|_updated|_disabled`, `products.item_group_created|_updated|_disabled`, `products.brand_created|_updated`, `products.variant_created|_template_updated`, `products.reorder_rule_created|_updated|_disabled`, `products.barcode_added|_removed`.
Consumed (`$consumes`, introspection-only): `masters.unit_of_measure_created|_updated|_retired` (UOM validation), `inventory.stock_changed` (refresh `last_purchase_rate` cache / projected-qty hint — no ledger writes), `masters.contact_created|_updated` (supplier/customer part-code defaults).

## 6. Integration map (no duplication)

| Needs                                                                       | Owner                                       | Products behavior                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| UOM definitions + conversion math                                           | `masters.unitsOfMeasure`                    | Validate `default_uom` + row UOMs; store factor snapshot; `$dependencies = ["masters"]`                                                     |
| Warehouses, stock ledger, valuation, reorder scan, serial/batch enforcement | `@aspen-os/inventory`                       | Expose item flags + reorder rows; consume nothing at runtime except validation hints                                                        |
| Rates, price lists                                                          | `@aspen-os/pricelist`                       | Seed `standard_selling_rate` → pricelist auto-creates Item Price on first save; cache `last_purchase_rate` from pricelist/accounting events |
| Tax templates, GL accounts, cost centers, deferred postings                 | Accounting (spec; no package yet)           | Opaque labels only; never a local tax/ledger table                                                                                          |
| Images/attachments (item image, spec sheets)                                | `dms`                                       | Soft link `file_id`; never a local file store                                                                                               |
| Reorder/expiry reminders                                                    | `calendar`                                  | Expose `getReorderRules`; bridge creates reminders                                                                                          |
| Inbox + out-of-band send                                                    | `comms`                                     | Publish intent; never `comms.deliver` topic                                                                                                 |
| Dashboards / saved views                                                    | `workspace` (`domain: "products:<entity>"`) | No local dashboard tables                                                                                                                   |

## 7. Proposed shape (Aspen OS conventions)

- `$name = "products"`, `$dependencies = ["masters"]`, units `db`, `pubsub` (+ `audit` from context). Stateless (no cron; reorder scan lives in inventory).
- Workflow groups (one action per file under `workflows/<entity>/<verb>.ts`): `p.products.items`, `p.products.groups`, `p.products.brands`, `p.products.manufacturers`, `p.products.attributes`, `p.products.variants`, `p.products.barcodes`, `p.products.alternatives`, `p.products.itemUoms`, `p.products.reorderRules`, `p.products.settings` (singleton get/update), `p.products.lookups` (query-only: `getByCode`, `getByBarcode`, `listByGroup`).
- Tables (all tenant, `snake_case`, `id: uuidv7().primaryKey()`, `timestamptz`, `numeric()` rates/weights, no FKs, alphabetical columns): `products_attribute`, `products_attribute_value`, `products_barcode`, `products_brand`, `products_item`, `products_item_alternative`, `products_item_customer_code`, `products_item_supplier_code`, `products_item_tax`, `products_item_uom`, `products_manufacturer`, `products_manufacturer_part`, `products_reorder_rule`, `products_setting` (singleton), `products_template_attribute`. Enums (`products_*` pgEnums, lowercase values): `item_status`, `naming_mode`, `valuation_method`, `material_request_type`, `barcode_type`, `variant_based_on`.
- Validation: Valibot `Create<Entity>Schema / Update<Entity>Schema / <Entity>FiltersSchema`; `Workflow.input(schema)` + `parse` for narrowed checks; `stripUndefined()` on updates; `?? null` DB writes / `?? undefined` event payloads; DB-boundary camelCase→snake_case mapping.
- ACL (`src/auth.ts` via `defineAcl`): `item`, `group`, `brand`, `manufacturer`, `attribute`, `variant`, `barcode`, `reorder_rule`, `setting`.
- Indexes: `idx_<table>_<column>`; FK-less soft-FK indexes on `item_id`, `item_group_id`, `brand_id`, `barcode` (unique), `item_code` (unique).

## 8. Explicit exclusions (do not build)

| Skipped                                                                          | Why / what to do instead                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Price Lists / Item Prices / pricing rules                                        | Owned by pricelist; products keeps seed + cache only                                                    |
| Warehouses / ledger / valuation / reservations / putaway / pick / reconciliation | Owned by inventory; products keeps flags + reorder rows only                                            |
| Stock Reports                                                                    | Skipped globally per instruction — no report tables, workflows, events, or RPCs                         |
| Website Item / slideshows / meta tags / hub sync                                 | No website module; ignore `show_in_website`/`weightage`-as-storefront; weightage kept as sort hint only |
| BOM / Work Order / routing, GL postings, VAT/GST returns                         | Opaque soft-FK labels; full engines need their own specs                                                |

## 9. Phasing

- **MVP (this spec):** §§3–7 as above, manual codes + naming-series, group/brand/manufacturer lookups, multi-UOM + barcodes, attribute/manufacturer variants with explicit sync, reorder rows, generic tax-exempt flags, deferred-revenue labels.
- **Phase 2 (deferred, not in MVP):** Website/hub publishing, AI reorder forecasting, image-variant galleries, supplier-price auto-compare, HSN/SAC jurisdiction packs, sample-retention depth, drop-ship orchestration. Each needs its own ADR/spec — do not smuggle into MVP.

## 10. Open questions

1. `standard_selling_rate` seed vs pricelist-only truth: keep one-time seed that auto-creates Item Price on item create (ERPNext parity, recommendation: yes) or force explicit pricelist entry (stricter)? Recommendation: seed-on-create only; later edits via pricelist.
2. `last_purchase_rate` cache: maintain on products row via pricelist/accounting events (recommendation: yes, cached display only, never used for valuation)?
3. Variant field-sync: explicit allowlist + manual `sync_from_template` (recommendation: yes) vs automatic propagation?
4. Cost-center/account labels: keep opaque text labels (recommendation: yes) or introduce accounting soft-FK registry now?
5. Fixed-asset items: keep `is_fixed_asset + auto_create_assets` flags with accounting-owned Asset register (recommendation: flags + `accounting.asset_created` consumption, no local asset tables)?
