# Constants Context

> Package: `@aspen-os/constants`. Shared `as const` enum objects + types. No tables, no workflows, no events, no ACL. Build-step package.

## Relationship Type

Shared kernel dependency — masters, notes, compliance, comms import enums from here instead of duplicating.

## Structure

- `src/index.ts` re-exports: `organization`, `masters`, `notes`, `compliance`, `comms`, `country-codes`.
- Pure constants; never import units or declare infra.

## Language

- Shared Enum (UPPER_SNAKE keys, lowercase values; `pgEnum` values reference these)
- Avoid: domain logic in constants
