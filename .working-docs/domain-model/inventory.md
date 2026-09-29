# Inventory Domain Model

> Package: `@aspen-os/inventory`. Multi-warehouse stock control — perpetual append-only ledger with FIFO/moving-average valuation, stock entries for every movement, reservations, putaway/pick execution, serial/batch traceability, and physical-vs-book reconciliation plus a nightly reorder scan. All 15 tables are tenant schemas (`inventory_` prefix). Product definitions/prices/UOMs/parties live in `@aspen-os/products`, `masters`, and accounting — inventory keeps soft FKs + rate snapshots, never local masters.

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INVENTORY DOMAIN                              │
│                                                                      │
│  ┌──────────────────┐  tree ┌──────────────────┐                     │
│  │ WarehouseType    │──────→│    Warehouse     │──1:N── StockLedger   │
│  │  kind            │       │  parent_id       │      (immutable rows) │
│  └──────────────────┘       │  is_group        │                     │
│                             │  disabled≠deleted│                     │
│  ┌──────────────────┐       └────────┬─────────┘                     │
│  │  StockEntry      │──1:N── StockEntryItem ──posts──→ StockLedger    │
│  │  purpose         │       │  itemId (soft FK                       │
│  │  postingDate     │       │   → products_item)                     │
│  │  status          │       │  qty/rate snapshot                     │
│  └──────────────────┘       └────────┬─────────┘                     │
│         ▲                            │                               │
│         │ additionalCost              │                               │
│  ┌──────────────────┐                 │                               │
│  │ AdditionalCost   │─────────────────┘                               │
│  └──────────────────┘                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ ReservationEntry │  │    PickList      │→ │  PickListItem    │     │
│  │  available =     │  │  purpose         │  │  pickedQty       │     │
│  │  onHand−reserved │  │  reserve→consume │  └──────────────────┘     │
│  └──────────────────┘  └──────────────────┘                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │  PutawayRule     │  │     Serial       │  │     Batch        │     │
│  │  priority/cap    │  │  status          │  │  split/move/     │     │
│  │  preview→apply   │  │  deliver/expire  │  │  expire          │     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘     │
│  ┌──────────────────┐──1:N── ReconciliationItem                       │
│  │ Reconciliation   │       (book vs counted → submit posts ledger)   │
│  │  purpose         │                                                │
│  └──────────────────┘  ┌──────────────────┐                          │
│                        │    Setting       │ (freeze window, defaults) │
│                        └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### Warehouse (Aggregate Root)

**Identity**: `id`; tree via `parent_id` + `is_group`. Only leaves hold stock; groups organize.

**Invariants**: disabled, never deleted, once history exists. Type via `WarehouseType` (`kind`).

**Lifecycle commands** (via `p.inventory.warehouses`, 5): `create/get/list/update/disable`. Types (via `p.inventory.warehouseTypes`, 6): `create/get/list/update/disable/seed`.

### Stock Entry + Ledger

**StockLedger** is immutable per-movement projection (`item × warehouse × qty × valuation_rate`). Every submit appends rows; cancellations append counter-rows; nothing edited in place.

**Valuation** per item (`fifo | moving_average`, default from settings). Receipt rows carry transaction rate; moving average derived (`value / qty`), never stored. Repack/manufacture rolls input cost into new items; transfers carry cost unchanged.

**Freeze window** (`freeze_upto_date` / `freeze_older_than_days`) blocks backdated postings except `freeze_allowed_role`.

**Lifecycle commands** (`p.inventory.stockEntries`, 7): `create/update/cancel/amend/list/get/submit`. Ledger (`p.inventory.ledger`, 1): `listLedgerEntries`.

### Reservation / Pick / Putaway

Reservations hold `available = on_hand − reserved` without moving physical stock (6): `create/get/list/consume/release/releaseMany`. Pick lists (11): `create/get/list/update/refreshStock/submit/cancel/markConsumed/suggest/reserve/updatePicked`. Putaway rules (6): `create/get/list/update/disable/preview` (`preview` → `putaway_applied` on submit).

### Serial / Batch / Reconciliation / Settings / Reorder

Serials (5): `create/get/list/expire/cancel` (+ `deliver`). Batches (8): `create/get/list/update/split/move/expire/expiring`. Reconciliations (7): `create/get/update/addItems/submit/cancel/list` (submit posts ledger). Settings (2): `get/update`. Reorder (2): `breaches/scan`.

## Domain Events — 21

Warehouses (3): `inventory.warehouse_created/_updated/_disabled`. Stock (1): `inventory.stock_changed` (per ledger commit — `itemId/warehouseId/qtyDelta/valuationRate/voucherType·Id/isTransitLeg`; consumed by accounting for GL posting). Stock entries (2): `stock_entry_submitted/_cancelled`. Reconciliation (1): `reconciliation_submitted`. Reorder (1): `reorder_triggered` (breach → accounting material-request flow). Reservations (3): `reservation_created/_consumed/_released`. Pick lists (3): `pick_list_created/_submitted/_cancelled`. Putaway (1): `putaway_applied`. Serials (2): `serial_created/_delivered`. Batches (4): `batch_created/_split/_moved/_expired`.

`$consumes = []` in code (runtime consumes nothing). `docs/events.mdx` lists introspection-only fulfilment pointers (`products.item_*`, `products.item_price_*`, `masters.unit_of_measure_updated`, `accounting.material_request_*/purchase_order_*/sales_order_*/receipt_*/delivery_*`) — docs-only, no subscriptions.

## Command-Query Separation

| Context   | Command               | Method                                 |
| --------- | --------------------- | -------------------------------------- |
| Inventory | Create stock entry    | `p.inventory.stockEntries.create()`    |
| Inventory | Submit stock entry    | `p.inventory.stockEntries.submit()`    |
| Inventory | Consume reservation   | `p.inventory.reservations.consume()`   |
| Inventory | Submit reconciliation | `p.inventory.reconciliations.submit()` |
| Inventory | Run reorder scan      | `p.inventory.reorder.scan()`           |

| Context   | Query                  | Method                               |
| --------- | ---------------------- | ------------------------------------ |
| Inventory | List ledger            | `p.inventory.ledger.list()`          |
| Inventory | List reorder breaches  | `p.inventory.reorder.breaches()`     |
| Inventory | Suggest pick locations | `p.inventory.pickLists.suggest()`    |
| Inventory | Preview putaway        | `p.inventory.putawayRules.preview()` |
| Inventory | List expiring batches  | `p.inventory.batches.expiring()`     |

## Invariants & Business Rules

6. **Append-only ledger** — submits append rows; cancels append counter-rows; no in-place edits.
7. **Leaf-only stock** — only non-group warehouses hold quantities.
8. **Soft masters** — items/prices/UOMs/parties are soft FKs + snapshots to `@aspen-os/products` / masters / accounting; never local masters.
9. **Available vs on-hand** — `available = on_hand − reserved`; reservations never move physical stock.
10. **Reorder scan** — nightly `inventory.reorder-scan` cron (`30 2 * * *`) reads `products_reorder_rule` (non-disabled), computes available, publishes `inventory.reorder_triggered` + audit per fresh breach.
