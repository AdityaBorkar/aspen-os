# Stub Modules

> Packages: `@aspen-os/crm`, `@aspen-os/fleet`, `@aspen-os/reports`.
> `@aspen-os/accounting`, `@aspen-os/products`, and `@aspen-os/inventory`
> graduated from stub status to full modules (see `bounded-contexts/accounting.md`,
> `products.md`, `inventory.md` + `domain-model/` counterparts).

## Relationship Type

Placeholder contexts — `package.json` holds only `{ "name": "@aspen-os/<module>" }` (no exports/deps/scripts, no `src/`). No domain model, no bounded context, no events.

`examples/` holds only the empty `examples/recruiter/seaweedfs-s3.json/` dir (no manifest, not a build participant).

## Relationship Type

Placeholder contexts — `package.json` is exactly `{ "name": "@aspen-os/<module>" }` (no exports/deps/scripts), `src/index.ts` is empty, and `docs/` holds only `index.mdx` + `meta.json` describing the "not-started" stub. No domain model, no bounded context, no events.

## Known cross-context expectations

Some implemented modules already reference these stubs by topic name (type-level contracts only — nothing subscribes today):

| Module | Referenced by          | Event expectation                                                           |
| ------ | ---------------------- | --------------------------------------------------------------------------- |
| Fleet  | Compliance EventBridge | `fleet.vehicle_registered` → pollution certificate + semi-annual obligation |

`accounting.financial_year_started` was in this table when accounting was a stub — it is now a real module (`@aspen-os/accounting` emits it; compliance EventBridge subscribes). See `bounded-contexts/accounting.md`.

## Status

Not started. When a stub becomes a real module it should follow the management-aligned module shape (see `CODING_CONVENTIONS.md` and `.agents/skills/write-module/SKILL.md`).
