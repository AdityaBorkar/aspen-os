# Inventory Context

> Package: `@aspen-os/inventory`. Domain module for multi-warehouse stock control — append-only ledger, stock entries, reservations, putaway/pick, serial/batch traceability, reconciliation, and reorder scan.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Runtime-wired — `$initialize()` stores `db` + `pubsub`, `$prepareRuntime()` registers the nightly `inventory.reorder-scan` cron, `$cleanup()` unregisters it. `$dependencies = ["masters", "products"]`, `$consumes = []` (empty in code; `docs/overview.mdx` + `docs/events.mdx` describe introspection-only `products.*` / `masters.unit_of_measure_updated` / `accounting.*` fulfilment pointers — docs-only, no subscriptions).

## Structure (`packages/inventory/`)

- `Inventory.create(config?)` — factory; `$config: Required<InventoryModuleConfig> = { reorderScanCron: "30 2 * * *" }`
- `$name = "inventory"`, `$dependencies = ["masters", "products"]`
- 12 workflow groups exposed as `readonly`: `batches` (8), `ledger` (1), `pickLists` (11), `putawayRules` (6), `reconciliations` (7), `reorder` (2), `reservations` (6), `serials` (5), `settings` (2), `stockEntries` (7), `warehouses` (5), `warehouseTypes` (6) — 66 actions total
- 15 database tables (all `tenant_schemas`, `control_plane_schemas = {}`): `inventory_additional_cost`, `inventory_batch`, `inventory_pick_list`, `inventory_pick_list_item`, `inventory_putaway_rule`, `inventory_reconciliation`, `inventory_reconciliation_item`, `inventory_reservation_entry`, `inventory_serial`, `inventory_setting`, `inventory_stock_entry`, `inventory_stock_entry_item`, `inventory_stock_ledger`, `inventory_warehouse`, `inventory_warehouse_type` — plus 10 `inventory_*` pgEnums
- 21 domain events published via PubSub (`InventoryEventMap` across 10 `*_EVENTS` maps)
- 11 ACL resources via `defineAcl()`
- Services: `reorder-scanner.ts`, `stock-service.ts`, `stock-posting.ts`, `stock-math.ts`, `pick-suggest.ts`, `posting/` (8 files) + `workflow-steps/fetch-entity.ts`, `fetch-inventory.ts`

## Scheduled jobs

| Topic                    | Cron         | Action                                                                                            |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------- |
| `inventory.reorder-scan` | `30 2 * * *` | Scan `products_reorder_rule` (non-disabled), publish `reorder_triggered` per fresh breach + audit |

## Exposed on the platform instance

```
p.inventory.warehouses      { create, get, list, update, disable }
p.inventory.warehouseTypes  { create, get, list, update, disable, seed }
p.inventory.stockEntries    { create, update, cancel, amend, list, get, submit }
p.inventory.ledger          { list }
p.inventory.reconciliations { create, get, update, addItems, submit, cancel, list }
p.inventory.reservations    { create, get, list, consume, release, releaseMany }
p.inventory.pickLists       { create, get, list, update, refreshStock, submit, cancel, markConsumed, suggest, reserve, updatePicked }
p.inventory.putawayRules    { create, get, list, update, disable, preview }
p.inventory.serials         { create, get, list, expire, cancel }
p.inventory.batches         { create, get, list, update, split, move, expire, expiring }
p.inventory.settings        { get, update }
p.inventory.reorder         { breaches, scan }
```

## Cross-context integration

- **Downstream of products + masters**: soft FKs to `products_item` / `products_reorder_rule` / UOMs; snapshots rates, never local masters.
- **Upstream of accounting**: `inventory.stock_changed` (per ledger commit, incl. `isTransitLeg`) → accounting GL posting; `reorder_triggered` → accounting material-request flow. Accounting owns `% supplied` updates off `stock_changed`.
- `docs/events.mdx` fulfilment pointers (`accounting.material_request_*/purchase_order_*/sales_order_*/receipt_*/delivery_*`) are docs-only — `$consumes` is `[]`.

## Language

- Warehouse, Warehouse Type, Stock Entry, Stock Ledger, Reservation, Pick List, Putaway Rule, Serial, Batch, Reconciliation, Reorder Scan
- Avoid: Stock Report/aging analytics (workspace dashboards); Item/Pricing masters (products); fulfilment documents (accounting)
