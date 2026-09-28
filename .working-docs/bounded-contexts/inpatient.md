# Inpatient Context

> Package: `@aspen-os/inpatient` (`$name = "inpatient"`, `$dependencies = ["healthcare"]`). Stateless shim — 2 workflow groups (nursing 14, residents 15), 0 owned tables / 35 table refs, 5 events, 2 ACL resources.

## Relationship Type

Downstream of Healthcare (Customer–Supplier, shim). Upstream of Tasks (`inpatient.nursing_created`) and Comms (`inpatient.resident_updated`).

## Structure

- `$initialize`/`$prepareRuntime`/`$cleanup` empty; no `$consumes`, no schedules, no subscriptions.
- Events: `inpatient.nursing_created/updated/escalated`, `inpatient.resident_created/updated`.

## Language

- Nursing (board, handover, escalation), Resident (long-stay, not IPD)
- Avoid: IPD admission / ADT bed management (out of scope)
