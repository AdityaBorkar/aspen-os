# Domain Model

This document is **overview** of domain model. Each package's domain has been split into its own file under `domain-model/`. Cross-cutting conventions, invariants, and anti-patterns live here.

## Per-Domain Files

| Package                   | File                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `@aspen-os/platform`      | [`domain-model/platform.md`](domain-model/platform.md)         |
| `@aspen-os/constants`     | [`domain-model/constants.md`](domain-model/constants.md)       |
| `@aspen-os/masters`       | [`domain-model/masters.md`](domain-model/masters.md)           |
| `@aspen-os/notes`         | [`domain-model/notes.md`](domain-model/notes.md)               |
| `@aspen-os/compliance`    | [`domain-model/compliance.md`](domain-model/compliance.md)     |
| `@aspen-os/tasks`         | [`domain-model/tasks.md`](domain-model/tasks.md)               |
| `@aspen-os/calendar`      | [`domain-model/calendar.md`](domain-model/calendar.md)         |
| `@aspen-os/comms`         | [`domain-model/comms.md`](domain-model/comms.md)               |
| `@aspen-os/dms`           | [`domain-model/dms.md`](domain-model/dms.md)                   |
| `@aspen-os/hr-core`       | [`domain-model/hr.md`](domain-model/hr.md)                     |
| `@aspen-os/hr-attendance` | [`domain-model/hr.md`](domain-model/hr.md)                     |
| `@aspen-os/hr-leave`      | [`domain-model/hr.md`](domain-model/hr.md)                     |
| `@aspen-os/announcement`  | [`domain-model/announcement.md`](domain-model/announcement.md) |
| `@aspen-os/management`    | [`domain-model/management.md`](domain-model/management.md)     |
| `@aspen-os/workspace`     | [`domain-model/workspace.md`](domain-model/workspace.md)       |
| `@aspen-os/healthcare`    | [`domain-model/healthcare.md`](domain-model/healthcare.md)     |
| `@aspen-os/diagnostics`   | [`domain-model/diagnostics.md`](domain-model/diagnostics.md)   |
| `@aspen-os/emr`           | [`domain-model/emr.md`](domain-model/emr.md)                   |
| `@aspen-os/inpatient`     | [`domain-model/inpatient.md`](domain-model/inpatient.md)       |
| `@aspen-os/pharmacy`      | [`domain-model/pharmacy.md`](domain-model/pharmacy.md)         |
| `@aspen-os/accounting`    | [`domain-model/accounting.md`](domain-model/accounting.md)     |
| `@aspen-os/products`      | [`domain-model/products.md`](domain-model/products.md)         |
| `@aspen-os/inventory`     | [`domain-model/inventory.md`](domain-model/inventory.md)       |

Bounded-context detail (relationships, structure, language) for each package lives in [`bounded-contexts/`](bounded-contexts/).

## Table Inventory by Package

| Package         | Tables            | Split                                                                                             |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| Platform (core) | 16                | audit_log, auth (10 better-auth), kv_store, logs, file_metadata, workflow_runs, workflow_steps    |
| Organization    | —                 | no package on disk (removed); org surface = `masters.orgBranches` + `management.organizations`    |
| Constants       | 0                 | shared enums only (organization, masters, notes, compliance, comms, country-codes) — no tables    |
| Masters         | 12                | all tenant (`master_` prefix except `org_branch`; incl. `master_uom_alias`, `master_uom_version`) |
| Notes           | 1                 | all tenant                                                                                        |
| Compliance      | 3                 | all tenant                                                                                        |
| Tasks           | 14                | 5 control-plane + 9 tenant                                                                        |
| Calendar        | 3                 | all tenant (`calendar_event`, `calendar_attendee`, `calendar_reminder`; no `calendar` table)      |
| Comms           | 8                 | 2 control-plane (`comms_provider`, `comms_push_subscription`) + 6 tenant (`comms_` prefix)        |
| DMS             | 12                | all tenant (`dms_` prefix)                                                                        |
| HR (3 pkgs)     | 42                | all tenant (hr-core 17, hr-attendance 11, hr-leave 14; `control_plane_schemas = {}`)              |
| Announcement    | 2                 | all tenant (`announcement`, `announcement_recipient`)                                             |
| Management      | 3                 | all control-plane (3 owned + 2 shadow re-exports)                                                 |
| Workspace       | 8                 | all tenant (`workspace_` prefix)                                                                  |
| Healthcare      | 137               | all tenant (`healthcare_` prefix) + 13 `healthcare_*` pgEnums (kernel; satellites re-export only) |
| Diagnostics     | 0 owned / 16 refs | shim over healthcare kernel (`diagnosticsTables` re-exports)                                      |
| EMR             | 0 owned / 56 refs | shim over healthcare kernel (`emrTables` re-exports)                                              |
| Inpatient       | 0 owned / 35 refs | shim over healthcare kernel (`inpatientTables` re-exports)                                        |
| Pharmacy        | 0 owned / 9 refs  | shim over healthcare kernel (`pharmacyTables` re-exports)                                         |
| Accounting      | 37                | all tenant (`accounting_` prefix; `control_plane_schemas = {}`) + 17 `accounting_*` pgEnums       |
| Products        | 19                | all tenant (`products_` prefix; `control_plane_schemas = {}`) + 8 `products_*` pgEnums            |
| Inventory       | 15                | all tenant (`inventory_` prefix; `control_plane_schemas = {}`) + 10 `inventory_*` pgEnums         |

## Cross-Cutting Conventions

### IDs

- Always `id: uuidv7().primaryKey()` — never native UUID columns, never explicit name (`uuidv7("id")` is forbidden). `uuidv7` is Drizzle column type exported from `@aspen-os/platform/server` (SQL `text`), and it generates UUIDv7 at insert time in JS.
- **Exception 1**: better-auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `apikey`, `twoFactor`, `passkey`) use `text().primaryKey()` without default.
- **Exception 2**: `management.tenant.id` uses `text().primaryKey()` without default; onboarding supplies ID.

### Timestamps

- Always `timestamp({ withTimezone: true })` — never `timestamp without time zone`.
- `createdAt`: `.notNull().defaultNow()`; `updatedAt`: generally `.notNull().defaultNow()` — some schemas add `$onUpdate(() => new Date())`, and workflows often set `updated_at` explicitly.
- `date` columns use drizzle's `date()` type with no explicit name. Date workflows commonly convert `Date` via `.toISOString().split("T")[0]`; HR employee date fields accept/persist strings.

### Table and column naming

- Table names `snake_case` (DMS carries `dms_` prefix); column names `snake_case` in **both** Postgres and TypeScript — TS object key **is** column name, never repeated inside datatype params (`owner_id: text().notNull()`, never `ownerId: text("owner_id")`). Columns sorted alphabetically by key.
- API boundary stays `camelCase` (Valibot input schemas, event payloads, platform context) with explicit mapping at DB boundary.
- Indexes: `idx_<table>_<column>`; DMS adds GIN full-text indexes named `idx_<table>_search`.

### Foreign keys

- No DB-level FK constraints in domain modules — soft FKs (logical references by naming convention). Platform core tables may use real FKs (e.g. `user_id` → `user.id` with `onDelete: "cascade"`).

### Validation

- Valibot for domain-module input (`Create<Entity>Schema` / `Update<Entity>Schema` / `<Entity>FiltersSchema`, types via `InferOutput`); no established Zod input-schema pattern in RPC source — do not introduce new Zod validation without checking `CODING_CONVENTIONS.md`.
- Constants as `as const` objects with `UPPER_SNAKE` keys and lowercase string values; `pgEnum` values reference constant objects.

## Cross-Cutting Invariants & Business Rules

1. **All IDs are text** — app-generated via `uuidv7()` column type (bakes in insert-time JS `generateUuidv7()` default), except better-auth tables and `management.tenant.id`.
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns.
3. **Cascade deletes** — User deletion cascades to sessions and accounts.
4. **No barrel files** — explicit convention in `CODING_CONVENTIONS.md`.
5. **No DB-level foreign keys in domain modules** — compliance, tasks, organization, masters, management, healthcare, hr, and announcement all use soft FKs.

Per-context invariants are numbered continuously from 6 onward in each `domain-model/<package>.md` file.

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told.
2. **Don't use native UUID columns** — always text.
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`.
4. **Don't call `create()` then try to register more modules** — pass all modules to `Platform.create()` at once.
5. **Don't assume dedicated role/permission tables** — roles are text on user table (except HR module's own RBAC, which is separate sub-domain).
6. **Don't add DB-level foreign key constraints in domain modules** — use soft FKs (logical references by naming convention).
7. **Don't set compliance verification status directly** — use lifecycle commands (submit, verify, reject, etc.) or `updateStatus`.
8. **Don't import bare `@aspen-os/platform`** — use `/server` or `/client` subpath explicitly.
