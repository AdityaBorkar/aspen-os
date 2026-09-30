# GAPS — products / inventory / accounting

Scope: `packages/products`, `packages/inventory`, `packages/accounting`.
Method: read `module.ts`, `pubsub.ts`, all `db-schemas/*`, workflow submit/create paths,
services, and `.working-docs/{bounded-contexts,domain-model}/{products,inventory,accounting}.md`.
The `.working-docs` intent is sound (products = master, inventory = movement ledger,
accounting = GL + fulfilment docs, all cross-refs soft `text` FKs). The code does not
yet honor it: several domains are doubly-owned, and every cross-module seam is either
a dead flag, an unwired `$consumes` string, or a raw-SQL read.

## 1. Domain repetition (two or three owners)

### G1. Settings duplicated — products vs inventory

- `packages/products/src/db-schemas/setting.ts`: `allow_negative_stock`,
  `auto_insert_price_if_missing`, `batch_naming_series`, `clean_description_html`,
  `default_valuation_method`, `default_warehouse_id`, `sample_retention_warehouse_id`,
  `show_barcode_field`, `limit_percent`, `over_deliver_receive_role`.
- `packages/inventory/src/db-schemas/setting.ts`: the same 10 keys (plus
  `enable_stock_reservation`, `enable_serial_batch`, `freeze_*`, `uom_restrict_*`).
- Same key, two singletons, two `settings.get/update` workflows, no sync and no
  documented precedence. `inventory` posting engine reads only its own
  (`EffectiveSetting`); `products` lookups read only theirs (`resolve-defaults.ts`).
  Drift example: `clean_description_html` defaults `true` in products, `false` in
  inventory; `show_barcode_field` defaults `true` vs `false`.
- **Fix:** single owner per key. Keep stock-policy keys
  (`allow_negative_stock`, `default_valuation_method`, `default_warehouse_id`,
  `sample_retention_warehouse_id`, `batch_naming_series`, freeze window) in **inventory**;
  keep master-data keys (`item_naming_by`, `default_item_group_id`, `default_stock_uom`)
  in **products**. Delete the mirrored columns in a push-schema release and route
  `products.lookups.resolveDefaults` warehouse fallback to `inventory.settings.get`.

### G2. Valuation owned in products, computed in inventory, ignored in accounting

- Products defines `productsValuationMethodEnum` (`fifo/moving_average`),
  `products_item.valuation_method` (nullable → settings fallback), and freezes it after
  transactions (`services/item-invariants.ts:41-46`).
- Inventory re-defines `inventoryValuationMethodEnum`, stores per-line override
  (`inventory_stock_entry_item.valuation_method: text`), and runs the only engine
  (`services/posting/pricing.ts`, `stock-math.ts`).
- Accounting has zero matches for `valuation|fifo|moving_average|COGS`
  (`src/` grep) — `sales-invoice/submit.ts:91-109` posts AR/income/tax only, no
  COGS/inventory-credit leg.
- **Fix:** products owns the _method declaration_ only; inventory owns the _engine_ and
  must publish `valuationRate` on every `stock_changed` event (it already does —
  `pubsub.ts:93-104`); accounting must consume it for COGS (see G9).

### G3. UOM in three places, none authoritative at runtime

- Canonical: `products_item_uom` (`item_id, uom, conversion_factor`,
  `must_be_whole_number`) + `products_item.default_uom`.
- Snapshot: `inventory_stock_entry_item.uom: text NOT NULL` + `conversion_factor`
  (default 1, stored not resolved — no import of products UOM in `services/posting/*`).
- Snapshot: every accounting line (`quotation/sales-order/purchase-order/invoice`
  items) carries `uom: text` + `uom_factor` default 1; `delivery/receipt` items carry
  `uom` with no factor at all (`db-schemas/sales.ts`, `purchase.ts`).
- Nothing validates `uom_factor` against `products_item_uom`, and
  `inventory_setting.uom_restrict_to_item_conversions` is unenforceable without that lookup.
- **Fix:** route all conversions through `products.itemUoms` /
  `priceFetch.getRate` (UOM-aware). Store `uom + factor + base_qty` on inventory legs
  and accounting lines; reject unknown UOMs at `create` time.

### G4. Pricing in three places

- Authoritative: `products_price_list` + `products_item_price` + `priceFetch.getRate`
  (party/batch specificity, validity windows, `fetch_count` telemetry).
- Inventory: `stock_entry_item.basic_rate` (input) → `valuation_rate` (computed) +
  `inventory_additional_cost` spread (`pricing.ts:80-87`). `auto_insert_price_if_missing`
  setting exists but no pricebook write was found.
- Accounting: `rate` on every quotation/order/invoice line, free-typed, with **no call
  to `priceFetch`** (grep `priceFetch|getRate|products\.` in `accounting/src` = zero hits).
- **Fix:** accounting `create` workflows resolve defaults via
  `products.lookups.resolveDefaults` + `products.priceFetch.getRate` and snapshot
  `price_list_id/rate/uom_factor`; inventory receipt `basic_rate` defaults from the
  linked PO/invoice rate instead of hand-typed input.

### G5. Tax category in two places

- `products_item_tax` (`tax_category, tax_template, tax_rate_override` — free text).
- `accounting_tax_template` + `accounting_tax_rule` (canonical, drives
  `totals-service.ts` and GL `taxRows`).
- No join key: products rows are never read by `computeDocumentTotals`.
- **Fix:** `tax_template`/`tax_category` strings become the shared key; accounting
  `create` falls back item → group → settings template; products never computes tax.

### G6. Reorder / material-request split across all three

- Owner of policy: `products_reorder_rule`
  (`item_id, check_in_group_id, request_for_warehouse_id, level/qty, material_request_type`).
- Scanner: `inventory/services/reorder-scanner.ts` reads it via **raw SQL**
  (`defaultReorderRuleProvider`, lines 57-66) — hidden coupling that bypasses the
  products workflow API, ignores `products.reorder_rule_*` events, and breaks if the
  table is renamed. Emits `inventory.reorder_triggered`, which nothing consumes.
- Dead-ends: `accounting_material_request` (`create/get/list` only, no submit/convert
  flow) and `purchase-order/reorder-signal.ts` (pure function on caller-supplied
  `{itemId, stockQty, reorderLevel}` — never queries stock).
- **Fix:** inventory consumes `products.reorder_rule_*` events (invalidate cache) and
  calls `products.lookups.getReorderRules` instead of SQL; `reorder_triggered`
  → `accounting.materialRequests.create` (add the missing submit/convert-to-RFQ/PO
  chain); delete `reorder-signal.ts` or reimplement it on live
  `inventory.reorder.breaches()`.

### G7. Warehouse master owned once, referenced twice without validation

- Owner: `inventory_warehouse` (tree, leaf-only stock enforced in
  `posting/stock-checks.ts` via `validateLegWarehouses`).
- `products_item.default_warehouse_id`, `products_item_group.*`,
  `products_setting.*`, `products_reorder_rule.request_for_warehouse_id` — all `text()`,
  no FK, `resolve-defaults.ts:39-43` cascades without existence check.
- Every accounting header/line `warehouse_id` — `text()`, nullable, unchecked
  (`delivery/create.ts:49`, `receipt/create.ts:49`).
- **Fix:** validate warehouse IDs at `create` time via `inventory.warehouses`
  (or a shared `warehouses.get` read); subscribe to
  `inventory.warehouse_disabled` to block new refs to disabled warehouses.

### G8. Stock-movement duplication — `stock_entry` vs `delivery_note` / `receipt_note`

- Inventory: `inventory_stock_entry` (9 purposes) + `inventory_stock_ledger`
  (immutable, append-only) is the designed single movement surface.
- Accounting: `accounting_delivery_note` + `accounting_receipt_note` move the _same_
  goods conceptually (update `delivered_qty`/`received_qty` percents) but write **zero**
  ledger rows and publish only `delivery_created / receipt_created` (id-only payloads),
  which inventory does not consume (`inventory $consumes = []`,
  `inventory/src/module.ts:38`).
- The `update_stock: boolean` guard on both invoice headers
  (`sales-invoice/create.ts:21`, `purchase-invoice/create.ts:21`) is convention-only:
  no code path moves stock when `true`, so delivery + `update_stock` invoice double-counts
  or neither counts.
- **Fix (one of):** (a) accounting delivery/receipt become thin wrappers that call
  `inventory.stockEntries.create+submit` (purpose `delivery`/`purchase_receipt`) and store
  the returned `stock_entry_id`; or (b) they publish rich events
  (`itemId/warehouseId/qty/uom/postingDate`) and inventory subscribes. Then enforce:
  `update_stock=true` invoices are rejected unless no linked delivery/receipt exists
  (already documented) **and** linked delivery/receipt is the _only_ stock writer.

### G9. GL integration missing in both directions

- `accounting/src/module.ts:23-28` declares
  `$consumes = ["inventory.stock_changed", …]` but `$prepareRuntime()` is empty —
  **no subscriber, no handler**. Perpetual-inventory GL (stock/COGS/valuation-variance
  postings) therefore never happens.
- Conversely inventory publishes rich `stock_changed` payloads
  (`itemId/warehouseId/qtyDelta/valuationRate/voucherType·Id/isTransitLeg`) that nobody
  reads, and `inventory_additional_cost` (landed cost) never reaches AP/GL.
- **Fix:** implement the accounting subscriber: on `stock_changed`, post
  receipt (Dr stock / Cr GRNI-or-payable at `valuationRate`), issue (Dr COGS / Cr stock),
  transfer (no GL or inter-warehouse clearing), reconciliation delta (Dr/Cr
  `difference_account`). Gate on open fiscal year (`assertPeriodOpen`) and reconcile
  with the inventory freeze window (G12).

### G10. Traceability flags without a link

- Products: `has_batch_no / has_serial_no / has_expiry_date / warranty_days`,
  `auto_create_batch`, `batch_number_series`, `serial_number_series`,
  `retain_sample`, `shelf_life_days` (`db-schemas/item.ts:52-56,81-84`).
- Inventory: `inventory_batch`, `inventory_serial` keyed by free-text `item_id`;
  nothing checks the item's flags before creating batch/serial rows, and
  `has_transactions`/`markTransacted` is only bumped by price-fetch writes, not by
  ledger postings — so `assertImmutableAfterTransactions` under-fires.
- Accounting delivery/receipt/invoice lines carry no `batch_no`/`serial_nos`.
- **Fix:** inventory validates flags via `products.items.get` (or a cached snapshot)
  on stock-entry submit; ledger postings call `products.items.markTransacted`;
  accounting fulfilment lines accept optional `batchNo/serialNos` and pass them through.

### G11. Fixed-asset bridge missing

- Products: `is_fixed_asset`, `auto_create_assets_on_purchase`
  (`db-schemas/item.ts:65,25`).
- Accounting: full asset register (`accounting_asset` + category/location/schedule,
  15 workflows) with optional `item_id: text NULL` — never populated automatically.
- **Fix:** on receipt/invoice submit for an `is_fixed_asset` item, publish
  `asset-eligible` (or call `accounting.assets.create`); keep
  `auto_create_assets_on_purchase` semantics in one place (products flag,
  accounting action).

## 2. Interop gaps (things that look wired but aren't)

| #   | Seam                                           | Evidence                                                                                                                                      | Effect                                                                                                   |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| I1  | Accounting `$consumes inventory.stock_changed` | `accounting/src/module.ts:23-28` declares; `$prepareRuntime/$cleanup` are no-ops                                                              | No COGS/stock GL, ever                                                                                   |
| I2  | Inventory reads products via SQL               | `inventory/src/services/reorder-scanner.ts:57-66`                                                                                             | Schema-coupled, event-blind                                                                              |
| I3  | Nobody consumes `products.item_*`              | products emits 29 events; inventory `$consumes=[]`, accounting `$consumes` lacks `products.*`                                                 | Stock can post for disabled/archived items; accounting accepts unknown `item_id`                         |
| I4  | `update_stock` flag                            | `sales-invoice/create.ts:21`, `purchase-invoice/create.ts:21`                                                                                 | Double-count or zero-count quantity                                                                      |
| I5  | Order-line matching by `item_id`               | `delivery/create.ts:81`, `receipt/create.ts:81`, invoice `submit.ts:161,171` find lines by `candidate.item_id === billed.item_id`             | Multi-line same-item orders misattribute `delivered/billed/received_qty`                                 |
| I6  | Serial `deliver` ACL/event without workflow    | `auth.ts` `serial.deliver`, `SERIAL_EVENTS.DELIVERED`, `serial/manage.ts` has only `expire/cancel`                                            | Dead capability; delivery flow can't retire serials                                                      |
| I7  | Fiscal period vs freeze window                 | Accounting `assertPeriodOpen` on every submit; inventory only `freeze_upto_date/freeze_older_than_days`                                       | Stock can post into a closed fiscal year; GL and ledger diverge                                          |
| I8  | Currency                                       | Accounting docs/lines hardcode `INR`; `products_price_list.currency` exists; inventory `valuation_rate` is a bare number                      | Multi-currency totals silently mix currencies                                                            |
| I9  | Reports overlap                                | `accounting.reports` has `purchaseAnalysis/procurementTracker/pending/delayed`; inventory has `ledger.list/reorder.breaches/batches.expiring` | Two pending/delayed surfaces; stock-value reports can't reconcile (no shared valuation date/rate source) |

## 3. Fix order (smallest safe sequence)

1. **P0 — Stop the double-count (G8/I4).** Decide the single stock writer
   (recommendation: inventory `stock_entry`; accounting delivery/receipt delegate).
   Wire `stock_entry_id` back onto delivery/receipt rows; enforce the
   `update_stock` guard in code, not comments.
2. **P0 — Wire `stock_changed` → GL (G9/I1).** Implement the accounting subscriber
   with fiscal-year gate; add COGS legs to `sales-invoice/submit.ts` and
   warehouse-aware stock legs to `purchase-invoice/submit.ts`. Landed cost
   (`inventory_additional_cost`) must flow into the receipt valuation _and_ the AP total.
3. **P1 — Kill the raw SQL (G6/I2).** Replace `defaultReorderRuleProvider` SQL with
   `products.lookups.getReorderRules`; subscribe to `products.reorder_rule_*`;
   connect `reorder_triggered` → `materialRequests.create`; remove or rewire
   `reorder-signal.ts`.
4. **P1 — Single settings ownership (G1).** Delete mirrored keys; add precedence test
   (`inventory` wins for stock policy).
5. **P1 — Line-identity matching (I5).** Pass `sales_order_item_id` /
   `purchase_order_item_id` through delivery/receipt/invoice items (columns already
   exist, currently written as `null` in `delivery/create.ts:63`,
   `receipt/create.ts:61`); match on line id, not `item_id`.
6. **P2 — UOM/price/tax resolution (G3–G5).** Accounting and inventory resolve via
   products at `create`; snapshot `price_list_id/uom_factor/tax_template` on each line.
7. **P2 — Traceability + assets (G10–G11).** Flag validation, `markTransacted` on
   ledger post, batch/serial passthrough, asset auto-creation event.
8. **P2 — Period/currency/reports (I7–I9).** Shared period guard (inventory honors
   fiscal-year close); currency carried alongside every rate; one pending/delayed
   report surface owned by accounting reading inventory ledger snapshots.
