# Inventory Spec — `@aspen-os/inventory`

Status: draft · Module: `@aspen-os/inventory` (`$name = "inventory"`) · All tables tenant-scope, `inventory_` prefix
Sources (analyzed):

- https://frappe.io/erpnext/open-source-inventory-management-system (§1–§7 only; §8 Stock Reports skipped entirely per instruction)
- Supporting detail: https://docs.frappe.io/erpnext/stock, `/warehouse`, `/stock-entry`, `/stock-reconciliation`, `/stock-reservation`, `/putaway-rule`, `/pick-list`, `/batch`, `/serial-no`, `/material-request`, `/stock-settings`

## 1. Goals / non-goals

Goals: multi-warehouse stock control with perpetual stock ledger + valuation, all inbound/outbound/internal movements, replenishment signals, order-linked reservation, putaway/pick execution, serial/batch traceability, and physical-vs-book reconciliation — integrated with Aspen OS products/pricelist/masters/accounting/comms/calendar.

Non-goals (completely skipped per instruction — no tables, workflows, events, or reports for these):

1. Stock Reports (ERPNext §8: Stock Aging, Stock Balance, Stock Ledger Report, available-batch/stock-level analytics). Transactional `inventory_stock_ledger` rows still exist for valuation/audit, but no report projections, aging buckets, or balance-as-of-date query surface in v1.
2. Product master, variants, and pricing (owned by `@aspen-os/products` and `@aspen-os/pricelist`; inventory stores soft-FK `item_id` only — see `PRODUCTS_SPEC.md`, `PRICELIST_SPEC.md`).
3. Procure-to-pay / order-to-cash documents (Purchase Receipt, Delivery Note, Sales/Purchase Invoice owned by accounting v1 as fulfilment pointers; inventory consumes their submitted events and posts the stock movement).
4. Manufacturing execution (BOM, Work Order, Job Card, production plan). Stock Entries with `purpose = manufacture|transfer_for_manufacture|consumption_for_manufacture` are accepted as opaque pointers with `work_order_id` soft-FK only.
5. Quality Inspection engine and landed-cost allocation (inspection flags carried opaquely; valuation additional-costs distributed pro-rata only — full QC/LCV engine deferred to Phase 2).

## 2. Ubiquitous language (Aspen OS mapping)

| Term                      | Meaning in this module                                                                                                     | Avoid / maps to                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Tenant                    | The single company. No `Company` master; tenant = legal entity                                                             | Company master, multi-company  |
| Item                      | Owned by `@aspen-os/products` (`products_item`); inventory never defines items                                             | Local item master              |
| Price                     | Owned by `@aspen-os/pricelist`; inventory reads `rate` snapshot on movements, never owns price lists                       | Local price tables             |
| UOM                       | Owned by `masters.unitsOfMeasure`; inventory validates `uom` + factor against it                                           | Local UOM                      |
| Party (customer/supplier) | `masters` Entity; referenced as soft-FK on transit/customer-provided flows                                                 | Local Customer/Supplier tables |
| Warehouse                 | Storage location node (room/row/shelf/bin). Tree via `parent_id` + `is_group`; leaf holds stock, group organizes           | Godown, Store (use Warehouse)  |
| Stock Ledger              | Immutable per-movement projection (`item_id × warehouse_id × qty × valuation_rate`); every submitted movement appends rows | Stock Report, balance table    |
| Valuation Rate            | Per-unit book value under item's valuation method (`fifo \| moving_average`); carried on each ledger row                   | Market price, selling rate     |
| Reservation               | Soft hold of available qty for a Sales Order / Pick List; reduces available without moving physical stock                  | Allocation (use Reservation)   |
| Reminder                  | Owned by `@aspen-os/calendar`; inventory only exposes reorder/expiry/freeze queries consumed via bridge                    | Local reorder mailer           |
| Notification              | Owned by `@aspen-os/comms`; inventory publishes intent events only                                                         | Local email/WhatsApp sender    |

## 3. Functional scope (ERPNext-parity minus §1 exclusions)

### 3.1 Warehouses (flexible tree)

- **F1 — Warehouse master (tree).** Fields: `name`, `parent_id?`, `is_group`, `warehouse_type` (stock/wip/transit/room/shelf/bin/supplier/customer + custom types), `account_head?` (soft-FK label for perpetual-inventory GL mapping owned by accounting), `address_id?`/`contact_id?` (soft-FK to masters), `is_disabled`. Rules: group never holds stock (movements rejected); leaf never has children; cannot flip group↔leaf with children/ledger history; disable (never hard-delete) warehouses with history; `Non-Group → Group` conversion allowed only when empty. Tree view + capacity summary fed by putaway rules (§3.5).
- **F2 — Warehouse types + transit warehouses.** `warehouse_type` lookup (v1-local seed: `stock|wip|transit|supplier|customer|room|shelf|bin`). `Add to Transit` two-leg transfers require a `transit`-type target on leg 1 and resolve against it on leg 2 (`End Transit` / `Get Items From Transit Entry`).

### 3.2 Stock movements (Stock Entry)

- **F3 — Stock Entry (single movement surface).** Purposes (v1): `material_issue`, `material_receipt`, `material_transfer`, `transfer_for_manufacture`, `consumption_for_manufacture`, `manufacture`, `repack`, `send_to_subcontractor`, `customer_provided_receipt`. Header: `purpose`, `posting_date/time` (freeze-guarded), `source_warehouse_id?`/`target_warehouse_id?` (required per purpose matrix), `work_order_id?` (opaque soft-FK), `is_opening?`, `add_to_transit?`, `apply_putaway_rule?`, `inspection_required?` (opaque flag). Rows: `item_id`, `qty`, `uom`, `conversion_factor`, `basic_rate` (snapshot from pricelist/last purchase, editable), `valuation_rate` (computed), `serial_no?`/`batch_no?`, per-row source/target override. Rules: drafts post nothing; submit validates negative-stock guard (§3.7), serial/batch mandatory checks, and freeze window; cancel reverses via counter-ledger rows (never delete submitted ledger). `allow_zero_valuation` flag permits zero-rate sample/mutual-understanding rows.
- **F4 — Repack + scrap/process-loss.** `repack` consumes N source rows into M new-item rows (e.g. bulk → packs). Scrap rows carry manual `basic_rate` into scrap warehouse; process-loss qty reduces finished-goods yield and rolls its cost into surviving FG valuation (no separate loss posting in v1).
- **F5 — Additional costs on inbound.** Header-level `additional_costs[]` (`expense_account` label, `description`, `amount`) distributed pro-rata over receiving rows by `basic_amount` and folded into `valuation_rate`. Perpetual-inventory GL booking of these costs stays with accounting (inventory publishes `inventory.stock_changed` with cost breakdown).
- **F6 — Opening stock.** `is_opening=true` Stock Entry or Stock Reconciliation with `purpose=opening_stock` seeds `qty + valuation_rate` per `item × warehouse` (serial/batch auto-created from series when blank). Difference account is an opaque `difference_account` label (accounting maps to Temporary Opening).

### 3.3 Replenishment (reorder + Material Request signal)

- **F7 — Reorder-point evaluation.** Per-item/warehouse-group rule consumed from products (`check_in_group`, `request_for_warehouse_id`, `reorder_level`, `reorder_qty`, `material_request_type: purchase|transfer|manufacture`). Nightly `inventory.reorder-scan` evaluates projected qty vs level; when breached, raises a Material Request pointer (owned by accounting `accounting_material_request` in v1 — inventory publishes `inventory.reorder_triggered`; accounting creates the request). Manual threshold import supported for migration. No AI forecasting in v1.
- **F8 — Material Request consumption.** Inventory consumes `accounting.material_request_created` to drive `Get Items From` flows (BOM/Sales Order/Product Bundle references carried opaquely). Statuses (`pending|partially_ordered|ordered|received|issued|transferred|stopped|cancelled`) tracked by accounting; inventory updates `% supplied` on movement submit.

### 3.4 Reservation (available-vs-on-hand)

- **F9 — Stock Reservation Entries.** Created against Sales Order items (reserve dialog: `warehouse_id`, `qty`) or from a submitted Pick List (`Reserve` bulk action). Fields: `sales_order_id`/`sales_order_item_id?`, `pick_list_id?`, `item_id`, `warehouse_id`, `reserved_qty`, `status: reserved|partially_delivered|delivered|cancelled`. Reserved qty decrements _available_ (`on_hand − reserved`) but not physical `on_hand`; Delivery Note / Sales Invoice submit consumes reservations FIFO. `Auto Reserve on Purchase` setting: Purchase Receipt submit against a linked PO/MR auto-reserves for the originating Sales Order. Unreserve via source document (`Unreserve`) or direct entry cancel (bulk cancel supported). Requires `enable_stock_reservation` in settings.

### 3.5 Putaway + Pick execution

- **F10 — Putaway Rule (inbound assignment).** Unique per (`item_id`, `warehouse_id`): `capacity`, `capacity_uom`, `priority` (1 = highest), `is_disabled`. Applied on Purchase Receipts and Stock Entries (`receipt|transfer`) when `apply_putaway_rule=true` (re-applied on save): priority first, then most free space; split one inbound row across N warehouses until capacity; hard error at full capacity. Direct putaway (receipt → final bins) and indirect/combined putaway (receipt → staging, then transfer with putaway) both supported. Capacity summary is a read projection over rules + ledger (no report-table persistence).
- **F11 — Pick List (outbound execution).** Purposes: `delivery` (from Sales Orders), `transfer_for_manufacture` (from Work Order + FG qty → raw-material explosion, opaque), `material_transfer` (from Material Requests of type transfer). Flow: `Get Items` (pending SOs/MRs) → `Get Item Locations` (FIFO warehouse suggestion; batch rule = nearest-expiry first; `parent_warehouse_id` scoping) → optional `Pick Manually` override (planner batch picks survive save) → `Update Current Stock` refresh (until downstream created) → submit → downstream Delivery Note (delivery purpose) or Stock Entry (transfer purposes). Tracks `% picked` back on source; barcode scan mode (`scan_mode`, `prompt_qty`) supported. Submit freezes locations; cancel allowed only before downstream creation.

### 3.6 Serial / batch traceability

- **F12 — Serial Numbers (one row per unit).** Auto-created on receipt/manufacture when item `has_serial_no` + `serial_number_series` set (or explicit numbers supplied); manual create allowed (warehouse unset until first movement). Lifecycle `status: available|delivered|expired|cancelled`; only `available` deliverable; purchase/manufacture provenance + customer/delivery linkage + warranty/AMC expiry carried per unit. Serial-wise valuation supported as optional per-unit rate snapshot. Immutable once transacted (cannot toggle item serial flag after first movement).
- **F13 — Batches (grouped units + shelf life).** Master per (`item_id`, `batch_id`): `expiry_date?`, `manufacturing_date?`, `supplier_id?` (soft-FK). Item flags: `has_batch_no`, `batch_number_series`, `auto_create_batch`, `has_expiry_date`, `retain_sample?`, `shelf_life_days?`. Every movement of a batched item requires `batch_no`; IDs filtered by item + warehouse + unexpired + on-hand. Split/move operations create/relocate batch rows. Expired batches blocked from delivery selection. `Retain Sample` routes sample qty to `sample_retention_warehouse` (settings).
- **F14 — Serial & Batch Bundle (v15+).** Reconciliation and high-volume movements persist a bundle row grouping the affected serial/batch units per ledger line (reconcile-all vs reconcile-selected semantics — see F15). Negative stock permanently forbidden for serial/batch items even when global/item negative-stock flags allow it.

### 3.7 Valuation, ledger, and settings

- **F15 — Stock Reconciliation (book ↔ physical alignment).** Purposes: `opening_stock` (see F6) and `stock_reconciliation` (qty and/or valuation-rate correction per `item × warehouse`, optional bundle for serial/batch: reconcile-all consumes all-but-listed units, reconcile-selected adjusts listed units only). Header: `posting_date/time`, `difference_account` label (default `Stock Adjustment`). Supports CSV template download/upload, `Get Stock Balance as of date/time` prefill, and barcode scan-count mode. Submit appends adjusting ledger rows; never edits history in place.
- **F16 — Perpetual valuation.** Item valuation method (`fifo|moving_average`, default from settings, locked after first transaction) drives `valuation_rate` computation per receipt/consumption; every submitted movement publishes `inventory.stock_changed` (`item_id`, `warehouse_id`, `qty_delta`, `valuation_rate`, `voucher_type/id`) for accounting's GL posting. No local GL tables — accounting owns ledger postings.
- **F17 — Owned settings.** `inventory_setting` singleton + lookups: `default_warehouse_id?`, `default_valuation_method`, `stock_uom_default` (label, masters-validated), `allow_negative_stock` (global) + per-item override consumed from products, `enable_serial_batch?`, `auto_insert_price_if_missing?` (delegated to pricelist), `auto_reserve_on_purchase?`, `freeze_upto_date?`, `freeze_older_than_days?`, `freeze_allowed_role?`, `sample_retention_warehouse_id?`, `batch_naming_series?`, `limit_percent` + `over_deliver_receive_role` (consumed by accounting order flows), `show_barcode_field?`, `clean_description_html?`, `allow_edit_stock_uom_qty?`, `uom_restrict_to_item_conversions?`. Freeze guard blocks backdated postings except `freeze_allowed_role`.

## 4. Document lifecycles + stock effects

| Document                   | Draft → …                                                  | Stock effect on submit                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stock Entry (all purposes) | `draft → submitted → (consumed) \| cancelled(+amend)`      | Append ledger rows: issue −qty source; receipt +qty target; transfer −/+ pair; transit leg 1 → transit warehouse; repack −sources +new items; manufacture +FG −components |
| Stock Reconciliation       | `draft → submitted \| cancelled`                           | Adjusting ledger rows to reach counted qty/rate (bundle-aware for serial/batch)                                                                                           |
| Stock Reservation Entry    | `reserved → partially_delivered → delivered \| cancelled`  | No physical move; decrements available; consumed by delivery/invoice                                                                                                      |
| Pick List                  | `draft → submitted → (delivered/transferred) \| cancelled` | None directly (execution plan); gates downstream Delivery Note / Stock Entry creation                                                                                     |
| Putaway Rule               | `active ↔ disabled`                                        | None directly; shapes warehouse split on next inbound with `apply_putaway_rule`                                                                                           |
| Serial No                  | `available → delivered \| expired \| cancelled`            | Created/consumed via movement ledger lines                                                                                                                                |
| Batch                      | `active → expired \| split/moved \| consumed`              | Qty tracked per batch; expiry blocks outbound selection                                                                                                                   |

Invariants: drafts never move stock; submitted docs immutable (amend = cancel + new draft, unwinding reservations/ledger in linked order); group warehouses never hold stock; serial/batch items never go negative; expired batches never deliver; freeze window blocks backdated postings; `allocated/reserved ≤ available`.

## 5. Domain events (`inventory.*`)

Produced (type-level contract; platform has no runtime side effects): `inventory.warehouse_created|_updated|_disabled`, `inventory.stock_changed` (per ledger commit — consumed by accounting for GL + reorder evaluation), `inventory.stock_entry_submitted|_cancelled`, `inventory.reconciliation_submitted`, `inventory.reorder_triggered`, `inventory.reservation_created|_consumed|_released`, `inventory.pick_list_created|_submitted|_cancelled`, `inventory.putaway_applied`, `inventory.serial_created|_delivered`, `inventory.batch_created|_expired|_split|_moved`.
Consumed (`$consumes`, introspection-only): `products.item_created|_updated|_disabled` (movement validation, reorder defaults), `pricelist.item_price_created|_updated` (basic-rate snapshot), `accounting.material_request_created|_cancelled`, `accounting.purchase_order_created`, `accounting.sales_order_created|_updated|_closed|_cancelled`, `accounting.receipt_created`, `accounting.delivery_created` (fulfilment pointers that trigger/consume movements), `masters.unit_of_measure_updated` (conversion-factor guard).

## 6. Integration map (no duplication)

| Needs                                                | Owner                                           | Inventory behavior                                                                            |
| ---------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Items, groups, variants, barcodes, reorder points    | `@aspen-os/products`                            | Soft-FK `item_id`; `$dependencies = ["masters","products"]`                                   |
| Selling/buying rates                                 | `@aspen-os/pricelist`                           | Snapshot `basic_rate` at movement time; reference only                                        |
| UOM + conversion                                     | `masters.unitsOfMeasure`                        | Validate row UOM; store factor snapshot                                                       |
| Customers/suppliers/addresses/contacts               | `masters` (`entities`, `contacts`, `addresses`) | Soft-FK `party_id` on subcontract/customer-provided/transit flows                             |
| Warehouse location hierarchy (org view)              | `masters.orgBranches`                           | Optional soft link; warehouse tree stays local                                                |
| GL postings, SRBNB, delivery/receipt pointers        | Accounting (spec; no package yet)               | Publish `inventory.stock_changed`; consume `accounting.*` fulfilment events; never a local GL |
| Reorder/expiry/freeze reminders                      | `calendar` (single Reminder surface)            | Expose `getReorderBreaches` / `getExpiringBatches`; bridge creates `calendar_reminder` rows   |
| Inbox + out-of-band send (reorder alert, count task) | `comms`                                         | Publish intent; sweeper delivers; never `comms.deliver` topic                                 |
| Attachments (GRN photos, count sheets), item images  | `dms`                                           | Soft link `file_id`; never a local file store                                                 |
| Dashboards / saved views                             | `workspace` (`domain: "inventory:<entity>"`)    | No local dashboard tables                                                                     |

## 7. Proposed shape (Aspen OS conventions)

- `$name = "inventory"`, `$dependencies = ["masters","products"]`, `$consumes = [products.*, pricelist.*, accounting.*]`, units `db`, `pubsub` (+ `audit` from context). Runtime-wired for `inventory.reorder-scan` nightly cron (register/unregister in `$prepareRuntime`/`$cleanup`); else stateless.
- Workflow groups (one action per file under `workflows/<entity>/<verb>.ts`): `p.inventory.warehouses`, `p.inventory.warehouseTypes`, `p.inventory.stockEntries`, `p.inventory.reconciliations`, `p.inventory.reservations`, `p.inventory.pickLists`, `p.inventory.putawayRules`, `p.inventory.serials`, `p.inventory.batches`, `p.inventory.settings` (singleton get/update).
- Tables (all tenant, `snake_case`, `id: uuidv7().primaryKey()`, `timestamptz`, `numeric()` money/rates, no FKs, alphabetical columns): `inventory_additional_cost`, `inventory_batch`, `inventory_pick_list`, `inventory_pick_list_item`, `inventory_putaway_rule`, `inventory_reconciliation`, `inventory_reconciliation_item`, `inventory_reservation_entry`, `inventory_serial`, `inventory_setting` (singleton), `inventory_stock_entry`, `inventory_stock_entry_item`, `inventory_stock_ledger` (append-only projection), `inventory_warehouse`, `inventory_warehouse_type`. Enums (`inventory_*` pgEnums, lowercase values): `stock_entry_purpose`, `reconciliation_purpose`, `pick_list_purpose`, `reservation_status`, `doc_status`, `serial_status`, `batch_status`, `valuation_method`, `warehouse_type`.
- Validation: Valibot `Create<Entity>Schema / Update<Entity>Schema / <Entity>FiltersSchema`; `Workflow.input(schema)` + `parse` for narrowed checks; `stripUndefined()` on updates; `?? null` DB writes / `?? undefined` event payloads; DB-boundary camelCase→snake_case mapping.
- ACL (`src/auth.ts` via `defineAcl`): `warehouse`, `warehouse_type`, `stock_entry`, `reconciliation`, `reservation`, `pick_list`, `putaway_rule`, `serial`, `batch`, `setting`.
- Indexes: `idx_<table>_<column>`; FK-less soft-FK indexes on `item_id`, `warehouse_id`, `sales_order_id`, `pick_list_id`, `batch_no`, `posting_date`.

## 8. Explicit exclusions (do not build)

| Skipped                                                                                 | Why / what to do instead                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stock Reports (aging, balance, ledger/balance/batch analytics)                          | Per instruction — no report tables, workflows, events, or RPCs; ledger rows exist for valuation/audit only; analytics deferred to `workspace` dashboards + future report spec |
| Item master / variants / UOM defs / price lists                                         | Owned by products/pricelist/masters; inventory keeps soft-FKs + snapshots only                                                                                                |
| Purchase/Sales fulfilment documents                                                     | Owned by accounting pointers; inventory moves stock on their events, never duplicates their headers                                                                           |
| Manufacturing (BOM/Work Order/Job Card), subcontract depth                              | Opaque `work_order_id` + purpose pointers only; no routing, costing, or shop-floor tables                                                                                     |
| Quality Inspection engine, landed-cost allocation, POS/loyalty, drop-ship orchestration | Opaque flags/cost distribution only; each needs its own ADR/spec — do not smuggle into MVP                                                                                    |

## 9. Phasing

- **MVP (this spec):** §§3–7 as above, FIFO + moving-average valuation, manual + auto reserve, direct + staging putaway, FIFO/nearest-expiry picks, serial/batch with bundles, CSV/scan reconciliation, freeze + negative-stock guards, explicit `reorder-scan` cron.
- **Phase 2 (deferred, not in MVP):** Stock Reports/aging analytics, landed-cost allocation depth, QC inspection workflows, barcode-label printing, bin-level slotting optimization, cycle-count scheduling, multi-warehouse reservation detail, e-way/route optimizations. Each needs its own ADR/spec — do not smuggle into MVP.

## 10. Open questions

1. Ledger table vs pure view: keep persisted `inventory_stock_ledger` (recommendation: persisted append-only rows for valuation + `inventory.stock_changed` atomicity, matching `accounting_gl_entry` pattern)?
2. Material Request ownership: keep request header in accounting (§F8 pointer) or move to inventory when accounting package lands? Recommendation: pointer + `inventory.reorder_triggered` consumption, header owned by accounting.
3. Serial-wise valuation: per-unit rate snapshot (v1) vs single item-rate? Recommendation: optional per-unit snapshot, default item valuation otherwise.
4. Reorder cron vs explicit action: nightly `inventory.reorder-scan` (v1) with `$prepareRuntime`/`$cleanup` wiring — confirm cadence and Purchase/Stock Manager notify fan-out via comms+calendar?
5. Transit warehouse accounting: does leg-1 transit move need an accounting marker like SRBNB? Recommendation: no GL on transit legs; GL only on terminal receipt/issue via `inventory.stock_changed`.
