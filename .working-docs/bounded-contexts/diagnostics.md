# Diagnostics Context

> Package: `@aspen-os/diagnostics` (`$name = "diagnostics"`, `$dependencies = ["healthcare"]`). Stateless shim — 1 workflow group (`diagnostics`, 22 actions), 0 owned tables / 16 table refs, 3 events, 1 ACL resource (`diagnostics` incl. `authorize`).

## Relationship Type

Downstream of Healthcare (Customer–Supplier, shim). Single-writer kernel in `@aspen-os/healthcare`; this package re-exports kernel storage via `diagnosticsTables`.

## Structure

- `$initialize`/`$prepareRuntime`/`$cleanup` empty; no `$consumes`, no schedules, no subscriptions.
- Events: `diagnostics.created`, `diagnostics.updated`, `diagnostics.authorized`.
- Elevated ACL: `diagnostics:authorize`.

## Language

- Diagnostics (lab order → sample → result → deliver + radio track)
- Avoid: kernel table ownership (that is `@aspen-os/healthcare`)
