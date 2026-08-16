# Repository Guidelines

## Project Overview

`@aspen-os` is a Bun monorepo containing a business framework (`@aspen-os/platform`) with pluggable **units** (infrastructure) and **modules** (domain logic), first-class multi-tenancy, and a Fumadocs docs site (`docs`). There is no host/example app in the repo yet (`CONTEXT.md` calls the intended first app "Recruiter").

Workspace state:

- **Fully implemented**: `platform`, `masters`, `organization`, `compliance`, `tasks`, `calendar`, `dms`, `management`, `hr`, `workspace`, `notes` (modules), `constants` (shared enums). `drive` was **removed from the repo** and its file/folder/label/share/trash surface consolidated into `dms` (see Current State). `masters` owns the polymorphic master data (contacts/addresses/bank accounts/connections/entities/payment methods + tenant-wide units of measure) extracted from `organization`; the note concept moved to the `notes` module (see Current State). Task reminders moved to `calendar` (`calendar_reminder` rows, `targetType = task`) via an event-driven task bridge (see Current State).
- **Pure stubs**: `accounting`, `crm`, `fleet`, `inventory`, `pharmacy`, `reports` (package.json holds only `name` + the `#/*` import alias).

Read `CODING_CONVENTIONS.md`, `CONTEXT.md`, and the domain docs in `.working-docs/` (`DOMAIN_MODEL.md` + `domain-model/<package>.md`, `BOUNDED_CONTEXTS.md` + `bounded-contexts/<package>.md`, `TODO.md`, `adr/`, `sow/`, `todo/`) before modeling domain changes. `CONTEXT.md` documents known gaps. `docs/` is the built documentation site, not the source of truth for domain docs.

## Architecture & Data Flow

Three platform **surfaces** (no root `src/index.ts` barrel; import via subpaths):

```
packages/platform/src/
  server/              # Node/Bun runtime — platform classes, units, workflows → @aspen-os/platform/server
  server/db-schemas.ts # shared schema-map barrel                              → @aspen-os/platform/server/db-schemas
  client/              # browser Platform (auth, logs, rpc units; no DB/tenancy) → @aspen-os/platform/client
  cli/                 # commander CLI, exposed as `aspen` bin                  → bin
```

Three server platform classes share an abstract `BasePlatform<M>` (`src/server/base-platform.ts`):

| Class                    | Create file                 | `run()`             | Config                 |
| ------------------------ | --------------------------- | ------------------- | ---------------------- |
| `SingleTenantPlatform`   | `create-single-tenant.ts`   | `run(fn)`           | `SingleTenantConfig`   |
| `SharedTenantPlatform`   | `create-shared-tenant.ts`   | `run(tenantId, fn)` | `SharedTenantConfig`   |
| `IsolatedTenantPlatform` | `create-isolated-tenant.ts` | `run(tenantId, fn)` | `IsolatedTenantConfig` |

**Lifecycle & data flow:**

```
Platform.create(config, modules)
  → BasePlatform.createCore(): instantiates units in load-bearing DI order,
     validates $dependencies, calls mod.$initialize(units), returns Proxy
p.$prepareInfra()
  → unit.$prepareInfra?.(); collect mod.$prepareInfra() (schemas/acl/events),
     merge into db.prepareWithModules() + auth.applyModuleAcl(); then mod.$prepareRuntime?.()
p.run(fn)               → fn executes inside AsyncLocalStorage; getContext() gives
                          { audit, auth, db, pubsub, tenantId?, actorId? }
p.$cleanup()            → mod.$cleanup() then unit.$cleanup()
```

- `BasePlatform` owns the Proxy wrapper — module `$name`s and unit keys become proxy accessors (`p.organization`, `p.db`, `p.auth`, …). `getModule(name)` / `getUnit(name)` are typed alternatives.
- All three classes return proxy-wrapped instances. `PlatformInstance<M[]>` is a structural type for the CLI; use `SingleTenantPlatformInstance<M>` etc. for typed `run()`.
- `run()` signatures are **not overloaded** — the type system enforces the correct mode.

**Multi-tenancy:**

- **Single**: one DB, no scoping.
- **Shared**: one DB with row-level security. `run(tenantId, fn)` opens a transaction, sets `app.tenant_id` + `SET LOCAL ROLE tenant_role`, creates a per-call drizzle instance (`DatabaseUnit.applyRlsPolicies()` during prepare).
- **Isolated**: DB-per-tenant via `TenantResolver { list(), resolve(tenantId) }` (a dummy resolver is constructed inline; `IsolatedTenantConfig.db` is `IsolatedTenantDatabaseConfig`, not `DatabaseConfig`). Global tenant IDs route to the control-plane DB via `isGlobalTenantId`.

## Key Directories

```
packages/
  platform/            # Core library — units, modules, tenancy, workflows, CLI (build step)
    src/server/        # base-platform.ts, create-{single,shared,isolated}-tenant.ts,
                       # units: db/ auth/ log/ pubsub/ storage/ rpc/ kv-store/ audit/, example.docker-compose.yaml
                       # workflows/, utils/ (context.ts, bun-compat.ts, is-global-tenant-id.ts)
    src/client/        # Platform class + auth/ logs/ rpc + context.ts, types.ts
    src/cli/           # commander CLI (db-studio, tenants)
  constants/           # Shared enums (build step) — country-codes.ts / languages.ts are empty; enums live in index.ts
  organization/        # Domain module (build step) — org profile + branches only (module.ts auth.ts
                       # pubsub.ts db-schemas/ schemas/ workflows/<entity>/<verb>.ts + workflow-steps/)
  masters/             # Domain module (build step) — polymorphic tenant master data: contact/address/
                       # bank_account/connection/entity/payment_method + tenant-wide unit_of_measure
                       # (7 master_* tables). connection = integration credentials (kvStore credentialRef,
                       # test/rotate workflows, management-hybrid getter bound to kvStore); contacts =
                       # business relationships (CONTACT_TYPE); entity = business party owner (ENTITY_TYPE);
                       # payment_method = modes of payment (masked card data, primary per scope+direction)
  notes/               # Domain module (build step) — first-class note entity (1 tenant table): title/body,
                       # metadata, personal/global access, tags, optional (scopeType, scopeId) polymorphic
                       # scope, type (shared NOTE_TYPE); services/access-service.ts + one workflow per verb
  compliance/          # Domain module — module.ts auth.ts pubsub.ts + services/ utils/constants.ts
  tasks/               # Domain module — module.ts auth.ts pubsub.ts + services/ utils/filter-engine.ts (16 tables;
                       # task reminders now live in calendar via the task bridge)
  calendar/            # Domain module (build step) — calendars/events/attendees + the platform's single
                       # polymorphic reminder surface (4 calendar_* tables + 8 pgEnums); services/
                       # (access-service, event-service, recurrence, reminder-dispatcher, task-bridge)
  dms/                 # Domain module (build step) — unified document/files management on one `file` entity
                       # (Triage → Classify → active, classes, contacts/shares + public links, legal holds,
                       # retention + purge) plus folders/labels/fileViews/trash (14 dms_* tables,
                       # expiry-scan + auto-purge crons)
  management/          # Control-plane module (build step) — module.ts auth.ts pubsub.ts
                       # workflow-steps/ (3 owned tables: service_provider, service_provider_user,
                       # tenant; no shadow/tenant tables)
  hr/                  # Domain module — module.ts auth.ts pubsub.ts db-schemas/ (50 tables: 14 control-plane + 36 tenant)
                       # workflows/ (one file per action → barrel-<group>.ts)
  workspace/           # Domain module (build step) — module.ts auth.ts pubsub.ts runtime.ts (view-resolver registry),
                       # db-schemas/ (10 tenant tables + 4 pgEnums), services/ (access-service, schedule-service),
                       # workflows/ (drafts lifecycle + comments, views, dashboards/widgets, schedules, utilities)
  accounting/ crm/ fleet/ inventory/ pharmacy/ reports/   # stubs
docs/              # Fumadocs site (port 3005) → Cloudflare Workers (wrangler.jsonc)
.working-docs/         # Canonical domain model + ADRs + SOWs (source of truth for domain docs)
.agents/skills/        # Repo-local skills: write-module (module scaffolding template), write-docs, writing-great-skills
tools/oxlint/anti-slop # Custom anti-slop oxlint plugin (see Lint & Format) — excluded from tsc + oxlint
scripts/               # build.ts (package builds), token-count.ts
```

## Development Commands

Root (`/`):

```
bun install            # install all workspace deps
bun run check:lint     # oxlint --fix . ; oxfmt .
bun run check:types    # tsc -b (root composite)
bun run update:deps    # taze -rw --maturity-period 3
bun run clean          # bunx rimraf --glob "**/{node_modules,.output,.local,bun.lockb}"
bun run prepare        # husky
```

Platform (`packages/platform`):

```
cd packages/platform && bun run check:types   # tsc -b
cd packages/platform && bun run check:lint    # oxlint --fix . ; oxfmt .
cd packages/platform && bun run build         # scripts/build.ts → .output/
```

**Build gotcha**: `platform`, `organization`, `management`, `constants`, and `dms` have a `build` script (`bun run ../../scripts/build.ts`), but only `platform`, `organization`, `management`, and `dms` carry a `build` config block. `bun run build` **rewrites the package's `package.json` in place** — for packages with a `build` config, `exports`/`bin` are re-pointed at `.output/` (gitignored); `constants` only emits declarations to `.output/` and its `exports` stay at `./src/index.ts`. `git status` will show that package.json as modified afterward; commit or discard deliberately. `bun run build --dev` rewrites them back to `./src/*` (un-builds without emitting). Both Bun and `tsc` resolve through `exports`, so on a fresh clone — or after `bun run clean`, which wipes `.output/` — downstream packages can't resolve `@aspen-os/platform` types until the build-step packages are built. Run `bun run build` **before** typechecking downstream packages (raw-src packages like `tasks`/`compliance`/`hr` import `@aspen-os/platform/server` via its `.output/` types, so editing platform source requires a rebuild to be seen anywhere).

docs (`bun run dev` → 3005):

```
bun run dev             # vite dev --port 3005
bun run check:types     # fumadocs-mdx && tsc --noEmit
bun run build           # bun gen:cf-types && vite build
bun run deploy          # wrangler deploy (Cloudflare Workers, wrangler.jsonc)
```

**docs gotchas**: `ignore-scripts=true` blocks the `postinstall` (`fumadocs-mdx`) — run `bunx fumadocs-mdx` manually if `.source/` is missing before build/typecheck. Docs runs on `@tanstack/react-start` + Vite; `wrangler.jsonc` defines `preview`/`production` envs with custom domains. `gen:cf-types` (via `bun gen:cf-types`) writes `worker-configuration.d.ts` (gitignored).

## Code Conventions & Common Patterns

### Unit vs Module

- **Unit**: infrastructure. `{ readonly $name; $cleanup(): Promise<void>; $prepareInfra?(): Promise<void> }` — `$` prefix on lifecycle methods.
- **Module**: domain. `{ readonly $name; readonly $dependencies: readonly string[]; $initialize(units); $prepareInfra(): ModuleInfra; $prepareRuntime?(); $prepareTenant?(tenantId); $cleanup() }`. Declares infra via `$prepareInfra()`:

```ts
type ModuleInfra = {
  auth: { acl: Record<string, readonly string[]> };
  db: { control_plane_schemas: Record<string, unknown>; tenant_schemas: Record<string, unknown> };
  events: Record<string, Record<string, string>>;
};
```

`auth.acl` → merged + applied via `AuthUnit.applyModuleAcl()`; schemas → pushed to the control-plane/tenant DB; `events` → type-level contracts only. Modules declare ACL with `defineAcl({ resource: ["create","read","update","delete", ...] })` (identity fn with const generic for literal inference).

### Domain-module pattern (management-aligned)

Every implemented module (management, masters, organization, compliance, tasks, dms, hr, workspace, notes) follows the same shape. **To scaffold a new module, load the `write-module` skill** (`.agents/skills/write-module/SKILL.md`) — it walks the exact dms-module template (flat `readonly` workflow groups in `workflows/index.ts`, `utils/constants.ts` enums, `db-schemas/enums.ts` `pgEnum`s, module-level `runtime.ts`, optional `services/` layer):

- `src/module.ts` holds the class (implements `Module`, static `create`, `readonly $name`/`$dependencies`/`$config`, `$prepareInfra()` returning `{ auth: { acl }, db: { control_plane_schemas, tenant_schemas }, events }`); `src/index.ts` just re-exports.
- `src/auth.ts` holds the ACL (`defineAcl(...)`); `src/pubsub.ts` holds events; `src/types.ts` re-exports constants + events + schemas; `db-schemas/` is directory form (one file per table + `enums.ts`); workflows are one file per action under REST-style folders `workflows/<entity>/<verb>.ts` (subresources nest, e.g. `class/field/add.ts`; scoped queries use `by-<qualifier>`, e.g. `comment/by-task/list.ts`) with reusable `WorkflowStep`s in `workflow-steps/`.
- Workflow groups: stateless `readonly` properties composed from imported per-workflow consts; a `#db` getter (management hybrid) only when a workflow is bound to a unit at construction time (`createX(this.#db)`).

Modules with non-empty runtime wiring (compliance schedules/handlers, hr scheduled jobs, management tenant onboarding, dms expiry-scan/auto-purge) keep `#private` unit refs set in `$initialize(units)` plus `async $prepareRuntime()` / `async $cleanup()` that register/unregister pubsub schedules; their workflow groups stay `readonly`.

`$initialize()` signatures vary by module — each types its own unit subset: organization/tasks take none; compliance takes `{ db, kvStore, pubsub }`; management `{ db, auth, pubsub }`; hr `{ db, pubsub }`; dms types it as `Record<string, Unit>` and pulls out `db`, `pubsub`, `storage` via type guards (no auth). management's `$name` is `"management"` (proxy `p.management`), `$dependencies: ["organization"]`.

### Database (Drizzle)

- IDs: `text` with `.primaryKey().$defaultFn(uuidv7)` — `uuidv7` is `crypto.getRandomValues()`-based, exported from `@aspen-os/platform/server`. Never native UUID (`text` columns hold UUID v7). Exception: better-auth tables use `text("id").primaryKey()` without default. `audit_log.id` is the sole native UUID column and uses `uuid().primaryKey().$defaultFn(() => uuidv7())`.
- Timestamps: `timestamp(..., { withTimezone: true })`; `createdAt` `.notNull().defaultNow()`, `updatedAt` `.notNull().defaultNow().$onUpdate(() => new Date())`.
- Table/column names `snake_case` in Postgres, `camelCase` in TS (drizzle maps). Columns sorted alphabetically by TS property name. Tables `snake_case`.
- `text` arrays, `jsonb("metadata")`, `numeric` for money, `bigint(..., { mode: "number" })` for sizes, `text("user_id").references(() => user.id, { onDelete: "cascade" })`.
- Schema pushed via `pushSchema()` from `drizzle-kit/api` — **not migration files** (ADR 0004).

### Validation

- **Valibot** for domain-module input: `Create<Entity>Schema` / `Update<Entity>Schema` / `<Entity>FiltersSchema`; types via `InferOutput`. Co-export separate `export type` and `export` blocks.
- **Zod** for oRPC RPC procedure inputs and env vars (t3-env).
- Constants as `as const` objects, `UPPER_SNAKE` keys, lowercase string values; shared in `@aspen-os/constants`, module-specific in `constants.ts`.
- Events `"domain:event_name"`, typed via `EventMap`, published as plain string topics. No `Result<T,E>` / `PaginatedResult` types — don't create them.

### TypeScript / Lint & Format

Root `tsconfig.json` (extended everywhere, `composite: true` project references): `strict`, `verbatimModuleSyntax` (use `import type`), `noUncheckedIndexedAccess`, `noUnusedLocals` (params allowed), `moduleResolution: "bundler"`, `module/target: ESNext`, `types: ["bun", "@types/bun"]`.

- **Path-alias gotcha**: each package maps `#/*` to its own `./src/*` (via `paths` in tsconfig + the `imports` field in package.json). Root tsconfig has no `paths`. Run `tsc -b` in the package whose alias you mean.
- **Linter/formatter is oxlint + oxfmt** (`.oxlintrc.json`, `.oxfmtrc.json`). `check:lint` runs `oxlint --fix` then `oxfmt` (both auto-fix). oxfmt sorts imports (URL → protocol/builtin → external → relative) and Tailwind classes (`clsx`/`cva`/`tw`/`cn`). `.zed/settings.json` sets oxfmt as the formatter and excludes `codedb.snapshot`/`.output`/`.coverage`.
- **Custom `anti-slop` oxlint plugin**: `tools/oxlint/anti-slop` (loaded via `.oxlintrc.json` `jsPlugins`, with type-aware linting on — `options.typeCheck: true`). Its rules are all `error`: `no-module-mocking` (no `vi.mock`/`jest.mock` — code should be testable via real instances), `no-object-parameters`, `no-reflect-get`/`no-reflect-apply`, `no-unsafe-dictionary-type`, `require-safety-comment-for-type-assertion`, `no-widen-then-assert`, etc. Other enforced gotchas: `eslint/no-warning-comments: "error"` (TODO/FIXME comments fail lint), `unicorn/filename-case: "error"`. `tools/` is excluded from both `tsc -b` and oxlint (oxlint also ignores `.agents/**`) — if you edit the plugin, its `rules/*.test.ts` are the repo's only tests (run `bun test` from `tools/oxlint/anti-slop`).

### Git hooks (Husky, active)

- `pre-commit`: `bunx lint-staged` → runs `oxfmt` on staged files (root `lint-staged` config is `"*": "oxfmt"`).
- `commit-msg`: `bunx commitlint --edit $1` — types `build chore ci docs feat fix perf refactor revert test wip`.

## Important Files

| File                                                                                    | Purpose                                                                                                                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/platform/src/server/index.ts`                                                 | Server barrel: `Unit`/`Module`/`ModuleInfra`/`PlatformInstance`, three platform classes, workflows, `getContext`, `defineAcl`, `isGlobalTenantId` |
| `packages/platform/src/server/base-platform.ts`                                         | `BasePlatform` (Proxy, `createCore`, `$prepareInfra`, `run`, `$cleanup`, `healthCheck`)                                                           |
| `packages/platform/src/server/{create-single,create-shared,create-isolated}-tenant.ts`  | The three platform classes                                                                                                                        |
| `packages/platform/src/server/db/index.ts` + `unit.ts`                                  | `DatabaseUnit` — pool, `db`/`controlPlaneDb`, tenancy, RLS, `prepareWithModules`, `getSchemas`                                                    |
| `packages/platform/src/server/auth/index.ts`                                            | `AuthUnit` — better-auth service, `fetchHandler`, `applyModuleAcl`, `rest` getter, `defineAcl`                                                    |
| `packages/platform/src/server/auth/db-schema.ts`                                        | better-auth tables — **generated** via `bun run gen:auth-schema` (committed; regenerate from `~config.ts`)                                        |
| `packages/platform/src/server/pubsub/index.ts`                                          | `PubSubUnit` — single control-plane pg-boss (lazy-started); see pubsub pitfalls below                                                             |
| `packages/platform/src/server/workflows/`                                               | `Workflow` / `WorkflowStep` durable step runner (`workflow_runs`/`workflow_steps` tables)                                                         |
| `packages/platform/src/cli/index.ts`                                                    | `aspen` CLI — `db-studio`, `tenants`; dynamically imports config (`platform` or `p` export)                                                       |
| `scripts/build.ts`                                                                      | Package builder: rewrites `exports`/`bin` → `.output/`, runs `Bun.build()` + `tsc` declarations                                                   |
| `docs/src/routes/docs/$.tsx`                                                            | Docs catch-all route — Fumadocs layout, server fn loader                                                                                          |
| `docs/source.config.ts`                                                                 | Fumadocs docs sources — every package's `docs/` dir (`platform`, `organization`, `dms`, `constants`, …)                                           |
| `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.json`, `bunfig.toml`, `.commitlintrc.json` | Toolchain config                                                                                                                                  |

### `rest` getter (server AuthUnit)

`AuthUnit.rest` exposes a REST `resource.action` API: `user.{create, get, remove, update, role.{assign, unassign}}`, `session.{create, invalidate, validate}`, `role.{list, remove}`. The `service` getter returns the full better-auth `AuthService` (`betterAuth` instance with `.api` for admin/organization plugin endpoints). Use `remove`, not `delete`. `applyModuleAcl(acl)` re-creates the service with `admin({ ac: createAccessControl(acl) })` during `prepareInfra()`.

### Workflows

```ts
const myWorkflow = Workflow.name("my-workflow")
  .input(MySchema)
  .handler(async (input, ctx) => {
    const r = await ctx.step.run(fetchStep, { id: input.id });
    const n = await ctx.step.run("inline", async () => 42);
    return r;
  });
await myWorkflow.run(input, { actorId });
```

- `Workflow.name(n).input(s).handler(fn)` → `WorkflowInstance.run(input, options?)`. `WorkflowStep.name(n).handler(fn)` for reusable steps.
- `ctx.step` is a `StepRunner`: `.run(stepInstance, input, options?)`, `.run("name", fn, options?)`, `.sleep(ms)`. `RunOptions` (`actorId?`, `audit?`, `auth?`, `config?`, `db?`, `pubsub?`) overrides `getContext()` defaults.
- Steps run in `WorkflowContext { actorId, audit, auth?, config, db, pubsub, runId, step }` with step-level retries.

## Runtime/Tooling Preferences

- **Runtime**: Bun (not Node.js). Package manager: Bun workspaces. Lockfile `bun.lockb`.
- **TypeScript**: `typescript` catalog `^7.0.2`. **Validation**: valibot (domain), zod (RPC/env). **ORM**: drizzle-orm `^0.45.2` + `pg`. **Auth**: better-auth `^1.6.26` (+ api-key, passkey, admin, organization plugins). **Pub/Sub**: pg-boss `^10.4.2`. **RPC**: oRPC (`@orpc/server`). **Storage**: AWS S3 SDK (SeaweedFS-compatible). Telemetry: `@opentelemetry/api`, logs via pino.
- **Root `workspaces.catalog`**: `@standard-schema/spec`, `@standard-schema/utils`, `@types/bun`, `bun`, `drizzle-kit`, `drizzle-orm`, `typescript`, `valibot` — referenced as `catalog:`.
- **`bunfig.toml`**: `ignore-scripts=true`, `minimumReleaseAge=259200` (3 days), `saveTextLockfile=false`, `telemetry=false`, `logLevel="warn"`.
- **Env (docs)**: `docs/.env.local` — `OPENROUTER_API_KEY`, optional `CLOUDFLARE_*` (account ID, API token, S3 credentials for the AI chat feature).
- **Infra (docker-compose)**: `packages/platform/src/server/example.docker-compose.yaml` — Postgres `postgres:18-alpine` on 5432 (user `aspen`, password `change-me`, RLS disabled via `row_security=off`). No SeaweedFS/storage service is defined in the repo.
- **No CI/CD** beyond `docs`'s `wrangler.jsonc` (deploy via `wrangler deploy`; preview `preview-id.aspen.adityab.tech`, production `aspen.adityab.tech`).

## Testing & QA

- **Status: effectively no test infrastructure in packages.** No test config (`vitest.config.*` / `jest.config.*` / `playwright.config.*`), no `__tests__`/`fixtures`/`mocks` dirs, no test scripts in any package. The only tests in the repo are the `tools/oxlint/anti-slop/rules/*.test.ts` rule tests (run with `bun test` from `tools/oxlint/anti-slop`; note `no-module-mocking` bans `vi.mock`/`jest.mock`).
- No test scripts in any package. No coverage config; `.zed/settings.json` pre-excludes `**/.coverage`.
- No dedicated type-check/test gate in CI (there is no CI). Quality checks are `check:lint` (oxlint/oxfmt) and `check:types` (`tsc -b`) per package.

## Pub/Sub Pitfall (pg-boss)

`PubSubUnit.publish` delegates to pg-boss `send()`, which runs `INSERT … SELECT … JOIN queue … ON CONFLICT DO NOTHING RETURNING id`. If a topic has **no queue row** (no consumer has called `subscribe()` → `boss.work()`), the INSERT matches nothing and `send()` returns `null` — the message is silently dropped. `publish()` `console.warn`s on a null return (it does **not** throw — it only throws on actual pg-boss errors). A topic with only producers is the classic silent-drop. `getUnsubscribedProducedTopics()` tracks produced topics with no subscriber, and `BasePlatform.healthCheck()` flags the report `"unhealthy"` when any exist. The single control-plane boss must be started lazily on first use (not in `$prepareInfra()`); health-check connectivity uses `boss.getQueueSize(topic)`, not `send()`.

## Current State

`masters`, `organization`, `compliance`, `tasks`, `calendar`, `dms`, `management`, `hr`, `workspace`, `notes` fully implemented and aligned to the management module structure (module.ts/auth.ts/pubsub.ts, db-schemas/, one workflow per file + steps/). `accounting`/`crm`/`fleet`/`inventory`/`pharmacy`/`reports` are stubs. No tests, no CI, no platform Docker/deployment config.

`@aspen-os/masters` owns **seven** tenant master-data tables (`master_` prefix): the polymorphic `contact` (business relationships — `CONTACT_TYPE`), `address`, `bank_account`, `connection` (integration connections — `INTEGRATION_TYPE`, status `CONNECTION_STATUS`, credentials stored in the platform `kvStore` referenced by `credentialRef`, with `test`/`rotateCredential` workflows), `entity` (business party owner — `ENTITY_TYPE`/`ENTITY_STATUS`, optional `organizationId` link, `setStatus` transitions) and `payment_method` (modes of payment — `PAYMENT_METHOD_TYPE`, `direction`, masked-only card data, primary per `(entityType, entityId, direction)`), plus the **tenant-wide** `unit_of_measure` (reference data — one base unit per `UOM_CATEGORY`, `baseUnitId`/`conversionFactor` self-reference invariant). `entity` is a `master_entity_type` owner value so existing masters can scope to it. Extracted from `organization` per `.working-docs/sow/masters.md`; the `connections` workflow group is bound to the kvStore unit via a getter (management hybrid); `entities`/`unitsOfMeasure`/`paymentMethods` groups are stateless `readonly`. `organization` now holds only `organization` + `branch` and depends on `["masters"]`; compliance's insurer flow subscribes to `masters:contact_created` (contact type `insurer`, entity `organization`).

`@aspen-os/notes` (`.working-docs/sow/notes.md`, complete) owns the single first-class **note** entity on one tenant table `note` (no `notes_` prefix): optional `title` (quick-capture), required `body`, `metadata` jsonb, `access` (`personal`/`global` — workspace vocabulary, enforced via `services/access-service.ts`: `assertCanAccess` = `global OR owner`, `assertCanMutate` = owner or tenant admin), `ownerId` (derived from `actorId`, explicit input wins), `tags text[]`, optional polymorphic `(scopeType, scopeId)` scope (free-form `<module>:<entity>` registry, e.g. `masters:contact`/`tasks:task`/`calendar:event`), and `type` from the shared `NOTE_TYPE`. Surface `p.notes.notes { create, delete, get, list, update }`; events `notes:note_created`/`note_updated`/`note_deleted`; 2 pgEnums (`notes_access`, `notes_note_type`). Stateless (`$initialize`/`$prepareRuntime`/`$cleanup` empty), `$dependencies = []`. The note concept was **removed from `@aspen-os/masters`** (`master_note`, `p.masters.notes`, `masters:note_added`/`note_removed`, note ACL resource, note schemas) — no domain regression, the annotation use-case survives via `scopeType`/`scopeId`. Hosts migrate `master_note` rows to `note` (`entityType → scopeType = masters:<entityType>`, `entityId → scopeId`, `content → body`, `userId → ownerId`) and `DROP TABLE master_note` (pushSchema never drops it). `notes:note` is a built-in workspace view domain (`VIEW_DOMAIN`).

`@aspen-os/calendar` (`.working-docs/sow/calendar.md`, complete) owns the three time-domain surfaces — **calendars** (named/colored collections, `personal`/`global` access, per-owner `isDefault`), **events** (time-boxed entries with structured jsonb `recurrence` expanded on read by `services/recurrence.ts`, attendees, timezone, and a polymorphic `(sourceType, sourceEntityId)` source link), and **reminders** (the platform's **single polymorphic reminder surface** — `calendar_reminder` with `targetType` `event`/`task`/`note`/`file`/`custom`, recipient-scoped via `userId`). Stateful (workspace schedule-service pattern): `$initialize({ db, pubsub })`, `$prepareRuntime()` registers the `calendar:reminder-scan` cron (`* * * * *`) + the **task bridge** (`services/task-bridge.ts`), `$cleanup()` unregisters. 4 `calendar_*` tenant tables + 8 pgEnums, 13 events, 4 ACL resources (`calendar`, `event`, `attendee`, `reminder`). **Tasks' reminder surface was removed** — `task_reminder` table + `reminders` workflow group + `reminder:fired` gone (16 tables/10 groups/10 events remain); tasks now publishes `task:due_date_changed` (`userIds` = assignees ∪ reporter) and its notification bridge is wired (the previously dead `publish*` helpers now fire on create/update/delete/assign/unassign/comment/link/status-change). Hosts migrate `task_reminder` rows to `calendar_reminder` (`targetType = 'task'`) and `DROP TABLE task_reminder` (pushSchema never drops it).

`@aspen-os/dms` is the single document-management module (the removed `@aspen-os/drive` was consolidated into it — see `.working-docs/sow/dms-consolidation.md`, Phases 1–7 complete). One `file` entity (folders/paths + class/triage/lifecycle on a single `dms_file` row), one label mechanism (`dms_label` + `dms_entity_label`), one sharing group (`p.dms.shares`), one trash module (`p.dms.trash` over `status`), and `fileViews` terminology — no `document`/`item-`/`tag`/`view`/`drive` leftovers.

`@aspen-os/workspace` (`.working-docs/sow/workspace.md`, complete) is the dependency-free personal-workspace module: **drafts** (title/body/notes/metadata, lifecycle `draft → submitted → approved → published` with optional approval, `reject` → `reopened` to `draft`, `reopen`, trash/restore via `deletedAt`, `duplicate`, threaded `workspace_draft_comment`s), **filter views** (`workspace_view` — cross-domain `conditions`/`sort`/`groupBy` stored opaquely; `apply` resolves through **host-registered resolvers** in `runtime.ts` (`registerViewResolver`/`getViewResolver`) — throws if none registered), **dashboards** (`workspace_dashboard` with jsonb `layout`, `duplicate`/`export`/`import` snapshot round-trip incl. widgets), **widgets** (`metric`/`breakdown`/`list`/`embed` — declarative configs, `domain` + exactly one of `filter`/`viewId` datasource, `refresh` tracks `lastRefreshedAt`/`lastError`), **schedules** (`services/schedule-service.ts` — per-schedule pg-boss cron `workspace:schedule:<id>`, `pause`/`resume`/`delete` register/unregister, handler publishes `workspace:schedule_due`; `markRun` records delivery; `$prepareRuntime()` re-registers all active schedules), and **utilities** (pins/recent/settings/watches/search — always `userId`-scoped). Access is a first-class user-set enum on drafts/views/dashboards — `personal`/`global` — enforced at runtime via `services/access-service.ts` (`assertCanAccess` = `global OR owner`; `assertCanMutate` = owner or tenant admin via `user.role`); widgets/schedules inherit dashboard access. 10 `workspace_*` tenant tables + 4 pgEnums, 40 events, 12 ACL resources. `$initialize({ db, pubsub })`, `$dependencies = []`. Host apps register view resolvers at startup and subscribe to `workspace:schedule_due`/`workspace:draft_published` (pg-boss drops unsubscribed topics — health check flags them).
