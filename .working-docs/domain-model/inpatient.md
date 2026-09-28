# Inpatient Domain Model

> Package: `@aspen-os/inpatient` (`$name = "inpatient"`, `$dependencies = ["healthcare"]`). Stateless shim over the healthcare kernel — owns zero tables; `inpatientTables` (35 refs: 12 nursing + 8 residents + 7 encounters + 1 observation + 6 billing + 1 counter) re-exports kernel storage.

## Aggregates

- **Nursing** (14 actions: board/note/vitals/io/pain/risk/drug/escalation/handover/tag) — emits `inpatient.nursing_created` (consumed by Tasks bridge) + `nursing_updated`/`nursing_escalated`.
- **Residents** (15 actions: admit/bed/daily/round/visit/charge/bill/summary/feedback; long-stay, not IPD) — emits `inpatient.resident_created`/`resident_updated` (`resident_updated` consumed by Comms bridge).

## Domain Events — 5

`inpatient.nursing_created`, `inpatient.nursing_updated`, `inpatient.nursing_escalated`, `inpatient.resident_created`, `inpatient.resident_updated`.

## Invariants & Business Rules

1. **Shim storage** — no owned tables/enums.
2. **Stateless runtime** — empty lifecycle; downstream Tasks/Comms subscribe to its events; it subscribes to nothing.
3. **No ADT/IPD** — residents = long-stay care only.
