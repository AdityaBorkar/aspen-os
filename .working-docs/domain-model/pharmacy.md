# Pharmacy Domain Model

> Package: `@aspen-os/pharmacy` (`$name = "pharmacy"`, `$dependencies = ["healthcare"]`). Stateless shim over the healthcare kernel — owns zero tables; `pharmacyTables` (9 refs: 8 pharmacy + 1 counter) re-exports kernel storage.

## Aggregates

### Pharmacy (Aggregate Root, shim)

Batch-tracked stock: item/batch/sale/return/PO/GRN/invoice/transfer + ledger. **Lifecycle commands** (`p.pharmacy.pharmacy`, 16 actions): `expiryAlerts`, `stockLedger`, `stockCorrect`, `transferAccept` flows.

## Domain Events — 3

`pharmacy.created`, `pharmacy.updated`, `pharmacy.dispensed`.

## Invariants & Business Rules

1. **Shim storage** — no owned tables/enums.
2. **Stateless runtime** — empty lifecycle; no schedules, no subscriptions.
