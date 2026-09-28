# Pricelist Spec — `@aspen-os/pricelist`

Status: draft · Module: `@aspen-os/pricelist` (`$name = "pricelist"`) · All tables tenant-scope, `pricelist_` prefix
Sources (analyzed):

- https://docs.frappe.io/erpnext/price-lists, `/item-price`
- Item-rate touchpoints: https://docs.frappe.io/erpnext/item (`Standard Selling Rate`, `Item Defaults`), https://docs.frappe.io/erpnext/stock-settings (`Auto insert Price List rate if missing`)

## 1. Goals / non-goals

Goals: manage selling and buying prices of products across zones, customers, suppliers, currencies-as-labels, batches, and validity windows — one Item Price row per (`item_id`, price-list, UOM, min-qty, customer/supplier/batch, validity) with deterministic fetch order for sales/purchase transactions.

Non-goals (no tables, workflows, events, or reports for these):

1. Automatic discount/margin engine (pricing rules). Manual `rate` + transaction-level discounts only (matches `ACCOUNTING_SPEC.md` §1.4 exclusion).
2. Product master, UOM definitions, warehouses, stock ledger (owned by products/masters/inventory; pricelist stores soft-FK `item_id` + UOM snapshot only).
3. Multi-currency conversion and exchange-rate management (one tenant base currency; `currency` carried as display label only — matches accounting single-currency non-goal).
4. Stock Reports including Item Price Stock report (skipped globally per instruction — no report projections).
5. Invoicing, payment terms, tax computation (owned by accounting; pricelist only supplies the fetched `rate`).

## 2. Ubiquitous language (Aspen OS mapping)

| Term                    | Meaning in this module                                                                                                                                                                         | Avoid / maps to                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Price List              | Named collection of Item Prices with `applicability: selling\|buying\|both`, `currency` label, `is_enabled`, optional `country?`/`territory?` labels                                           | Price book (use Price List)      |
| Item Price              | Single rate row: (`item_id`, `price_list_id`, `uom`, `rate`, `packing_unit?`, `min_qty?`, `customer_id?`/`supplier_id?`, `batch_no?`, `valid_from?`/`valid_upto?`, `lead_time_days?`, `note?`) | Rate card, price entry           |
| Applicability           | Whether a list applies to selling, buying, or both; gates customer-field vs supplier-field visibility                                                                                          | Type (use applicability)         |
| UOM-dependent price     | Default: rate is per the row's UOM; `price_not_uom_dependent=true` allows auto-scaling across UOMs via conversion factor                                                                       | Unit price (ambiguous)           |
| Validity window         | [`valid_from`, `valid_upto`] interval; fetch filters by transaction date; expired rows never fetch                                                                                             | Effective date (use validity)    |
| Standard Buying/Selling | Seed lists created by default; every item expected to have at least one rate in each applicable list                                                                                           | Default rate (use standard list) |

## 3. Functional scope (ERPNext-parity minus §1 exclusions)

### 3.1 Price Lists

- **F1 — Price List master.** Fields: `name` (unique, e.g. `Standard Selling`, `Standard Buying`, `Zone-East Selling`), `applicability` (`selling|buying|both`), `currency` (label, defaults to tenant base), `country?`/`territory?` (opaque labels), `is_enabled`, `price_not_uom_dependent?` (default false — see F3), `default_customer_id?`/`default_supplier_id?` tagging (soft-FK to masters Entity; auto-selects list on transactions for that party). Rules: disabled lists never fetch and are hidden from transaction pickers; `Standard Selling`/`Standard Buying` seeded on tenant provision and never hard-deleted; rename safe (rows key by `price_list_id`); applicability narrowing (`both → selling`) blocked while opposite-side party-specific rows exist.
- **F2 — List → transaction wiring.** Sales/purchase documents carry `price_list_id`; on `item_id + uom + qty + party + date` the fetch order is: (1) party-and-batch-specific row, (2) party-specific row, (3) batch-specific row, (4) UOM+min-qty-validity row in the selected list, (5) group-default list fallback (products `default_price_list`), (6) `standard_selling_rate` seed (products) only when `auto_insert` enabled and no row exists. No silent cross-list arbitrage — one list per document.

### 3.2 Item Prices

- **F3 — Item Price core.** Fields: `item_id` (soft-FK to products), `price_list_id`, `uom` (masters-validated; defaults to item `default_uom`), `rate` (`numeric()`, per-row-UOM), `packing_unit?` (qty múltiplier per UOM unit; 0/NULL = no-op; supports fractional packs like 1.5 kg), `min_qty?` (threshold for this rate to apply), `customer_id?` (visible only when list `applicability` includes selling), `supplier_id?` (visible only when buying), `batch_no?` (soft-FK label to inventory batch; selected-batch transactions prefer batch-matched rate), `valid_from?` (defaults to creation date) + `valid_upto?`, `lead_time_days?` (vendor-differentiated rates for same item), `note?`, `is_active` (derived: enabled list + within validity). Constraints: one active row per (`price_list_id`, `item_id`, `uom`, `min_qty`, `customer_id`, `supplier_id`, `batch_no`, validity-overlap) — overlapping validity with identical keys rejected; `rate ≥ 0`; `customer_id` and `supplier_id` never both set; batch rows require batched items; service items priced per time-UOM (e.g. `$80 per hour`) supported via masters time-category UOMs.
- **F4 — UOM handling.** Default UOM-dependent: transaction in a different UOM converts via products conversion factor (`rate × factor`) only when `price_not_uom_dependent=true` on the list; otherwise only exact-UOM rows fetch (e.g. Tomatoes `per Kilo` never auto-fills a `per Box` line). `Allow UOM with conversion defined` inventory setting is respected at fetch time (unlisted-UOM rejection propagates as fetch miss, not error).
- **F5 — Auto-insert on first transaction.** When `auto_insert_price_if_missing` (flag owned by products settings, executed here) is on and a sales/purchase transaction carries a manual `rate` with no matching Item Price, pricelist auto-creates the missing row in the document's list (rate = transaction rate, UOM = transaction UOM, `valid_from` = transaction date). When off, `standard_selling_rate` seed creates the initial Item Price at item-create time only; later manual rates stay document-local. Auto-insert never overwrites existing rows and never fires for party/batch-specific prices (those require explicit creation).
- **F6 — Validity + lead-time differentiation.** Multiple rows per (`item_id`, list, UOM) coexist with non-overlapping validity windows (seasonal/limited offers) or distinct `lead_time_days` (same product, faster vs slower vendor). Fetch filters `valid_from ≤ txn_date ≤ valid_upto ?? ∞` and surfaces `lead_time_days` for buyer choice; expired rows retained for audit, excluded from fetch.
- **F7 — Party/batch-specific pricing.** Optional `customer_id` (selling lists) or `supplier_id` (buying lists) pins a rate to one party; optional `batch_no` pins to one batch (e.g. premium lot). Specificity wins over generic rows (see F2 order). Bulk-assign via `assign_to_parties` action (one rate template × N parties creates N rows — explicit rows, never dynamic rules).

### 3.3 Settings owned here

- **F8 — Owned settings.** Mirror of the execution flags (source of truth for flags lives in products settings for ERPNext parity; pricelist caches/consumes them — v1 single writer is products): `auto_insert_price_if_missing`, `default_selling_list_id?`, `default_buying_list_id?`. Pricelist-local: `allow_party_specific?` (default true), `allow_batch_specific?` (default true), `require_validity?` (default false). Everything else by reference: items (products), UOMs (masters), batches (inventory), parties (masters).

## 4. Document lifecycles + fetch semantics

| Entity     | Draft → …                                                                                               | Effect                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Price List | `enabled ↔ disabled`; delete only when zero Item Prices                                                 | Disabled hides from pickers + blocks fetch; seeded standards never deleted                                  |
| Item Price | `active → expired → (superseded)`; `cancelled` only before first fetch-use; never hard-delete used rows | Expiry is time-driven (`valid_upto` pass) or explicit `expire` action; history retained for audit           |
| Fetch      | Stateless read (`getRate(item_id, price_list_id, uom, qty, party_id?, batch_no?, txn_date)`)            | Returns single `rate + source_row_id` or miss (caller falls back per F2); no writes except auto-insert path |

Invariants: one list per document; fetch is deterministic (specificity → validity → min-qty → lead-time); expired/disabled never fetch; overlapping-validity duplicates rejected; auto-insert creates only generic rows; `rate` snapshots into documents (later price edits never rewrite posted vouchers).

## 5. Domain events (`pricelist.*`)

Produced (type-level contract; platform has no runtime side effects): `pricelist.price_list_created|_updated|_disabled`, `pricelist.item_price_created|_updated|_expired` (consumed by inventory for `basic_rate` snapshots and by accounting for order/invoice rate defaults; products consumes to refresh `last_purchase_rate` cache).
Consumed (`$consumes`, introspection-only): `products.item_created|_updated|_disabled` (seed/auto-insert triggers, UOM validation), `products.reorder_rule_created` (none — no-op guard), `inventory.batch_created|_expired` (batch-specific price eligibility), `masters.contact_created|_updated` (party-specific defaults).

## 6. Integration map (no duplication)

| Needs                                                  | Owner                                        | Pricelist behavior                                                                    |
| ------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Items, groups, default lists, seeds                    | `@aspen-os/products`                         | Soft-FK `item_id`; `$dependencies = ["products"]` (masters transitively via products) |
| UOM definitions                                        | `masters.unitsOfMeasure`                     | Validate row `uom`; store factor snapshot at create                                   |
| Batches (batch-specific rates)                         | `@aspen-os/inventory`                        | Soft-FK `batch_no` label; consume `inventory.batch_*`; never a local batch table      |
| Parties (customer/supplier-specific rates)             | `masters` (`entities`)                       | Soft-FK `customer_id`/`supplier_id`; never a local party master                       |
| Rate consumption (orders, invoices, material requests) | Accounting (spec; no package yet)            | Expose `getRate` / `getRatesForList`; accounting snapshots `rate` into docs           |
| Stock movement valuation (`basic_rate`)                | `@aspen-os/inventory`                        | Expose same fetch; inventory snapshots at movement time                               |
| Reminders (price-expiry nudge)                         | `calendar`                                   | Expose `getExpiringPrices`; bridge creates reminders                                  |
| Inbox + out-of-band send                               | `comms`                                      | Publish intent; never `comms.deliver` topic                                           |
| Dashboards / saved views                               | `workspace` (`domain: "pricelist:<entity>"`) | No local dashboard tables                                                             |

## 7. Proposed shape (Aspen OS conventions)

- `$name = "pricelist"`, `$dependencies = ["products"]`, `$consumes = [products.*, inventory.batch_*]`, units `db`, `pubsub` (+ `audit` from context). Stateless (no cron; expiry derived on read + explicit `expireDuePrices` action callable from host scheduler).
- Workflow groups (one action per file under `workflows/<entity>/<verb>.ts`): `p.pricelist.lists`, `p.pricelist.itemPrices`, `p.pricelist.fetch` (query-only: `getRate`, `getRatesForList`, `getActiveForItem`), `p.pricelist.settings` (singleton get/update).
- Tables (all tenant, `snake_case`, `id: uuidv7().primaryKey()`, `timestamptz`, `numeric()` rates, no FKs, alphabetical columns): `pricelist_list`, `pricelist_item_price`, `pricelist_setting` (singleton). Enums (`pricelist_*` pgEnums, lowercase values): `applicability` (`selling|buying|both`), `doc_status`.
- Validation: Valibot `Create<Entity>Schema / Update<Entity>Schema / <Entity>FiltersSchema` (validity overlap check in handler via `parse` + range query); `Workflow.input(schema)` + `parse` for narrowed checks; `stripUndefined()` on updates; `?? null` DB writes / `?? undefined` event payloads; DB-boundary camelCase→snake_case mapping.
- ACL (`src/auth.ts` via `defineAcl`): `list`, `item_price`, `fetch` (read-only), `setting`.
- Indexes: `idx_<table>_<column>`; FK-less soft-FK indexes on `item_id`, `price_list_id`, `customer_id`, `supplier_id`, `batch_no`, `valid_from`, `valid_upto`; composite uniqueness enforced in handler (no DB exclusion constraint in v1).

## 8. Explicit exclusions (do not build)

| Skipped                                                          | Why / what to do instead                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Pricing rules / discount engine / margins / coupons / loyalty    | No auto-discount tables; manual `rate` + line/order discounts in accounting only          |
| Multi-currency conversion, exchange rates, presentation currency | Single base currency; `currency` is display label; foreign-supplier bills entered in base |
| Stock Reports / Item Price Stock report                          | Skipped globally per instruction — no report tables, workflows, events, or RPCs           |
| Tax computation, payment terms, GL postings                      | Owned by accounting; pricelist supplies `rate` only                                       |
| Item master / UOM defs / batches / parties                       | Soft-FKs only; authoritative tables live in products/masters/inventory                    |

## 9. Phasing

- **MVP (this spec):** §§3–7 as above, selling/buying/both lists, UOM-specific + `price_not_uom_dependent` scaling, min-qty/packing-unit, party/batch specificity, validity windows, lead-time differentiation, auto-insert-on-first-use, deterministic fetch order.
- **Phase 2 (deferred, not in MVP):** Pricing-rule engine, tiered/slab pricing, currency conversion, bulk import shooting, price-approval workflows, POS price sync, promotion calendars. Each needs its own ADR/spec — do not smuggle into MVP.

## 10. Open questions

1. Validity overlap: DB exclusion constraint vs handler-level range check (recommendation: handler check in v1, constraint later)?
2. `price_not_uom_dependent` default: per-list flag defaulting false (recommendation: yes, ERPNext parity) or tenant-wide default?
3. Auto-insert writer: keep flag in products settings with pricelist as executor (recommendation: yes) or move flag ownership to pricelist now?
4. `packing_unit` semantics: keep ERPNext multiplier behavior (recommendation: yes, with `0/NULL = no-op` guard)?
5. Expiry job: on-read derivation + explicit `expireDuePrices` (recommendation: yes, no dedicated cron in v1) vs `pricelist.expiry-scan` cron?
