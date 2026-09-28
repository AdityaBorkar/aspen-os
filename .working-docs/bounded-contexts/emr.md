# EMR Context

> Package: `@aspen-os/emr` (`$name = "emr"`, `$dependencies = ["healthcare"]`). Stateless shim — 5 workflow groups (allopathy 10, dental 11, ayush 16, rehab 12, psych 14), 0 owned tables / 56 table refs, 10 events, 5 ACL resources.

## Relationship Type

Downstream of Healthcare (Customer–Supplier, shim). Single-writer kernel in `@aspen-os/healthcare`; this package re-exports kernel storage via `emrTables`.

## Structure

- `$initialize`/`$prepareRuntime`/`$cleanup` empty; no `$consumes`, no schedules, no subscriptions.
- Events: `{allopathy,dental,ayush,rehab,psych}.created/updated` (2 each).
- Elevated ACL: `psych:override` (controlled prescriptions).

## Language

- Allopathy, Dental, Ayush, Rehab, Psych (five-specialty EMR)
- Avoid: kernel table ownership (that is `@aspen-os/healthcare`)
