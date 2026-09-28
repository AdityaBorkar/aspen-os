# Pharmacy Context

> Package: `@aspen-os/pharmacy` (`$name = "pharmacy"`, `$dependencies = ["healthcare"]`). Stateless shim — 1 workflow group (`pharmacy`, 16 actions), 0 owned tables / 9 table refs, 3 events, 1 ACL resource.

## Relationship Type

Downstream of Healthcare (Customer–Supplier, shim). Single-writer kernel in `@aspen-os/healthcare`; this package re-exports kernel storage via `pharmacyTables`.

## Structure

- `$initialize`/`$prepareRuntime`/`$cleanup` empty; no `$consumes`, no schedules, no subscriptions.
- Events: `pharmacy.created`, `pharmacy.updated`, `pharmacy.dispensed`.

## Language

- Pharmacy (batch-tracked stock, ledger)
- Avoid: kernel table ownership (that is `@aspen-os/healthcare`)
