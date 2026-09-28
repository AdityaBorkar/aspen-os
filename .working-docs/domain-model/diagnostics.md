# Diagnostics Domain Model

> Package: `@aspen-os/diagnostics` (`$name = "diagnostics"`, `$dependencies = ["healthcare"]`). Stateless shim over the healthcare kernel — owns zero tables; `diagnosticsTables` (16 refs: 8 lab/radio + 7 encounters + 1 observation + 1 counter) re-exports kernel storage (single-writer kernel in `@aspen-os/healthcare`).

## Aggregates

### Diagnostics (Aggregate Root, shim)

Lab orders → samples → results → delivery + radio track. **Lifecycle commands** (`p.diagnostics.diagnostics`, 22 actions): test/panel masters, order labs, collect/receive/reject samples, record results, radio book/checkin/report, QC, TAT.

**Invariants**: `authorize` gated by `diagnostics:authorize` ACL (elevated, lives here — not in kernel).

## Domain Events — 3

`diagnostics.created`, `diagnostics.updated`, `diagnostics.authorized`.

## Invariants & Business Rules

1. **Shim storage** — no `pgTable`/`pgEnum` owned; all reads/writes hit kernel tables. Do not add DB-level FKs.
2. **Stateless runtime** — `$initialize`/`$prepareRuntime`/`$cleanup` empty; no schedules, no subscriptions.
