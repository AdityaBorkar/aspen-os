# Domain Model

This document is the **overview** of the domain model. Each package's domain has been split into its own file under `domain-model/`. Cross-cutting conventions, invariants, and anti-patterns live here.

## Per-Domain Files

| Package                  | File                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `@aspen-os/platform`     | [`domain-model/platform.md`](domain-model/platform.md)         |
| `@aspen-os/organization` | [`domain-model/organization.md`](domain-model/organization.md) |
| `@aspen-os/masters`      | [`domain-model/masters.md`](domain-model/masters.md)           |
| `@aspen-os/compliance`   | [`domain-model/compliance.md`](domain-model/compliance.md)     |
| `@aspen-os/tasks`        | [`domain-model/tasks.md`](domain-model/tasks.md)               |
| `@aspen-os/dms`          | [`domain-model/dms.md`](domain-model/dms.md)                   |
| `@aspen-os/hr`           | [`domain-model/hr.md`](domain-model/hr.md)                     |
| `@aspen-os/management`   | [`domain-model/management.md`](domain-model/management.md)     |

Bounded-context detail (relationships, structure, language) for each package lives in [`bounded-contexts/`](bounded-contexts/).

## Table Inventory by Package

| Package         | Tables | Split                                                                                          |
| --------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Platform (core) | 16     | audit_log, auth (10 better-auth), kv_store, logs, file_metadata, workflow_runs, workflow_steps |
| Organization    | 2      | all tenant                                                                                     |
| Masters         | 5      | all tenant (`master_` prefix)                                                                  |
| Compliance      | 3      | all tenant                                                                                     |
| Tasks           | 17     | 6 control-plane + 11 tenant                                                                    |
| DMS             | 15     | all tenant (`dms_` prefix)                                                                     |
| HR              | 50     | 14 control-plane + 36 tenant                                                                   |
| Management      | 3      | all control-plane (0 shadow tables)                                                            |

## Cross-Cutting Conventions

### IDs

- Always `text` with `.primaryKey().$defaultFn(uuidv7)` — never native UUID columns. `uuidv7` is the `crypto.getRandomValues()`-based function exported from `@aspen-os/platform/server`; `.$defaultFn` sets the default at insert time in JS.
- **Exception 1**: better-auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `apikey`, `twoFactor`, `passkey`) use `text("id").primaryKey()` without a default.
- **Exception 2**: `audit_log.id` uses `uuid().primaryKey().$defaultFn(() => uuidv7())` — the sole native uuid column.

### Timestamps

- Always `timestamp("...", { withTimezone: true })` — never `timestamp without time zone`.
- `createdAt`: `.notNull().defaultNow()`; `updatedAt`: `.notNull().defaultNow().$onUpdate(() => new Date())`.
- `date` columns use drizzle's `date()` type, converted from `Date` objects via `.toISOString().split("T")[0]`.

### Table and column naming

- Table names `snake_case` (DMS carries a `dms_` prefix); column names `snake_case` in Postgres, `camelCase` in TS; columns sorted alphabetically by TS property name.
- Indexes: `idx_<table>_<column>`; DMS adds GIN full-text indexes named `idx_<table>_search`.

### Foreign keys

- No DB-level FK constraints in domain modules — soft FKs (logical references by naming convention). Platform core tables may use real FKs (e.g. `user_id` → `user.id` with `onDelete: "cascade"`).

### Validation

- Valibot for domain-module input (`Create<Entity>Schema` / `Update<Entity>Schema` / `<Entity>FiltersSchema`, types via `InferOutput`); zod for oRPC RPC inputs and env vars (t3-env).
- Constants as `as const` objects with `UPPER_SNAKE` keys and lowercase string values; `pgEnum` values reference the constant objects.

## Cross-Cutting Invariants & Business Rules

1. **All IDs are text** — app-generated via the JS `uuidv7()` function (inserted via drizzle's `$defaultFn`), except better-auth tables and `audit_log.id`.
2. **All timestamps are TIMESTAMPTZ** — `withTimezone: true` on all timestamp columns.
3. **Cascade deletes** — User deletion cascades to sessions and accounts.
4. **No barrel files** — explicit convention in `CODING_CONVENTIONS.md`.
5. **No DB-level foreign keys in domain modules** — compliance, tasks, organization, masters, management, and hr all use soft FKs.

Per-context invariants are numbered continuously from 6 onward in each `domain-model/<package>.md` file.

## Anti-Patterns to Avoid

1. **Don't create barrel files** unless explicitly told.
2. **Don't use native UUID columns** — always text.
3. **Don't use `timestamp without time zone`** — always `withTimezone: true`.
4. **Don't call `create()` then try to register more modules** — pass all modules to `Platform.create()` at once.
5. **Don't assume dedicated role/permission tables** — roles are text on the user table (except the HR module's own RBAC, which is a separate sub-domain).
6. **Don't add DB-level foreign key constraints in domain modules** — use soft FKs (logical references by naming convention).
7. **Don't set compliance verification status directly** — use the lifecycle commands (submit, verify, reject, etc.) or `updateStatus`.
8. **Don't import bare `@aspen-os/platform`** — use the `/server` or `/client` subpath explicitly.
