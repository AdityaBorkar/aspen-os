# Domain Model

This document is **overview** of domain model. Each package's domain has been split into its own file under `domain-model/`. Cross-cutting conventions, invariants, and anti-patterns live here.

## Per-Domain Files

| Package                   | File                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `@aspen-os/platform`      | [`domain-model/platform.md`](domain-model/platform.md)         |
| `@aspen-os/organization`  | [`domain-model/organization.md`](domain-model/organization.md) |
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

Bounded-context detail (relationships, structure, language) for each package lives in [`bounded-contexts/`](bounded-contexts/).

## Table Inventory by Package

| Package         | Tables | Split                                                                                             |
| --------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Platform (core) | 16     | audit_log, auth (10 better-auth), kv_store, logs, file_metadata, workflow_runs, workflow_steps    |
| Organization    | —      | no package on disk (removed); org surface = `masters.orgBranches` + `management.organizations`    |
| Masters         | 12     | all tenant (`master_` prefix except `org_branch`; incl. `master_uom_alias`, `master_uom_version`) |
| Notes           | 1      | all tenant                                                                                        |
| Compliance      | 3      | all tenant                                                                                        |
| Tasks           | 14     | 5 control-plane + 9 tenant                                                                        |
| Calendar        | 4      | all tenant (`calendar_` prefix)                                                                   |
| Comms           | 7      | 1 control-plane (`comms_provider`) + 6 tenant (`comms_` prefix)                                   |
| DMS             | 12     | all tenant (`dms_` prefix)                                                                        |
| HR (3 pkgs)     | 51     | 12 control-plane (hr-core setup/access) + 39 tenant (hr-core 14, hr-attendance 11, hr-leave 14)   |
| Announcement    | 2      | all tenant (`announcement`, `announcement_recipient`)                                             |
| Management      | 4      | all control-plane (4 owned + 2 shadow re-exports)                                                 |
| Workspace       | 8      | all tenant (`workspace_` prefix)                                                                  |
| Healthcare      | 140    | all tenant (`healthcare_` prefix) + 13 `healthcare_*` pgEnums                                     |

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
