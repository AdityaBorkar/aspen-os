# Stub Modules

> Packages: `@aspen-os/crm`, `@aspen-os/fleet`, `@aspen-os/inventory`, `@aspen-os/reports`.

## Relationship Type

Placeholder contexts — `package.json` holds only `{ "name": "@aspen-os/<module>" }` (no exports/deps/scripts, no `src/`). No domain model, no bounded context, no events.

`packages/pricelist/` is not a stub — it has no `package.json`/`src/` at all (untracked leftover, never a workspace package; ignore). `examples/` holds only the empty `examples/recruiter/seaweedfs-s3.json/` dir (no manifest, not a build participant).

## Relationship Type

Placeholder contexts — `package.json` is exactly `{ "name": "@aspen-os/<module>" }` (no exports/deps/scripts), `src/index.ts` is empty, and `docs/` holds only `index.mdx` + `meta.json` describing the "not-started" stub. No domain model, no bounded context, no events.

## Known cross-context expectations

Some implemented modules already reference these stubs by topic name (type-level contracts only — nothing subscribes today):

| Module     | Referenced by          | Event expectation                                                           |
| ---------- | ---------------------- | --------------------------------------------------------------------------- |
| Fleet      | Compliance EventBridge | `fleet.vehicle_registered` → pollution certificate + semi-annual obligation |
| Accounting | Compliance EventBridge | `accounting.financial_year_started` → monthly GST return obligation         |

## Status

Not started. When a stub becomes a real module it should follow the management-aligned module shape (see `CODING_CONVENTIONS.md` and `.agents/skills/write-module/SKILL.md`).
