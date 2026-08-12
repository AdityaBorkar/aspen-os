# Repository Guidelines

## Project Overview

`@aspen-os` is a Bun monorepo containing a business framework (`@aspen-os/platform`) with pluggable **units** (infrastructure) and **modules** (domain logic), first-class multi-tenancy, and a Fumadocs docs site (`docs`). There is no host/example app in the repo yet (`CONTEXT.md` calls the intended first app "Recruiter").

Workspace state:

- **Fully implemented**: `platform`, `organization`, `compliance`, `tasks`, `drive`, `management` (modules), `constants` (shared enums).
- **Partial**: `hr` — module logic largely written but the class does not `implements Module` and lacks `$prepareRuntime()`.
- **Pure stubs**: `accounting`, `crm`, `fleet`, `inventory`, `pharmacy`, `reports` (package.json is just `{ "name": "..." }`).

Read `CODING_CONVENTIONS.md`, `CONTEXT.md`, and the domain docs in `.working-docs/` (`DOMAIN_MODEL.md`, `BOUNDED_CONTEXTS.md`, `TODO.md`, `adr/`) before modeling domain changes. `CONTEXT.md` documents known gaps. `docs/` is the built documentation site, not the source of truth for domain docs.

## Architecture & Data Flow

Three platform **surfaces** (no root `src/index.ts` barrel; import via subpaths):

```
packages/platform/src/
  server/   # Node/Bun runtime — platform classes, units, workflows     → @aspen-os/platform/server
  client/   # browser Platform (auth, logs, rpc units; no DB/tenancy)   → @aspen-os/platform/client
  cli/      # commander CLI, exposed as `aspen` bin                      → bin
```

Three server platform classes share an abstract `BasePlatform<M>` (`src/server/base-platform.ts`):

| Class | Create file | `run()` | Config |
|---|---|---|---|
| `SingleTenantPlatform` | `create-single-tenant.ts` | `run(fn)` | `SingleTenantConfig` |
| `SharedTenantPlatform` | `create-shared-tenant.ts` | `run(tenantId, fn)` | `SharedTenantConfig` |
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
  constants/           # Shared enums (country-codes.ts, languages.ts — both files currently empty; enums live in index.ts)
  organization/        # Domain module (build step) — module.ts auth.ts pubsub.ts db-schemas/ schemas/ workflows/<entity>.<action>.ts + steps/
  compliance/          # Domain module — module.ts auth.ts pubsub.ts + services/ utils/constants.ts
  tasks/               # Domain module — module.ts auth.ts pubsub.ts + services/ utils/filter-engine.ts (17 tables)
  drive/               # Domain module — module.ts auth.ts pubsub.ts + services/ runtime.ts
  management/          # Control-plane module (build step) — module.ts auth.ts pubsub.ts workflows/steps/ (3 owned tables: service_provider, service_provider_user, tenant; no shadow/tenant tables)
  hr/                  # Domain module — module.ts auth.ts pubsub.ts db-schemas/ (38 tables) workflows/ (class-based → Workflow builder)
  accounting/ crm/ fleet/ inventory/ pharmacy/ reports/   # stubs
docs/              # Fumadocs site (port 3005) → Cloudflare Workers (wrangler.jsonc)
.working-docs/         # Canonical domain model + ADRs + SOWs (source of truth for domain docs)
scripts/               # build.ts (package builds), token-count.ts
```

## Development Commands

Root (`/`):

```
bun install            # install all workspace deps
bun run check:lint     # biome check --fix .
bun run check:types    # tsc -b (root composite)
bun run update:deps    # taze -rw --maturity-period 3
bun run clean          # rimraf node_modules/.output/.local/bun.lockb
bun run prepare        # husky
```

Platform (`packages/platform`):

```
cd packages/platform && bun run check:types   # tsc -b
cd packages/platform && bun run check:lint    # biome check --fix .
cd packages/platform && bun run build         # scripts/build.ts → .output/
```

**Build gotcha**: platform's published `exports`/`bin` point at `.output/`. TypeScript resolves types from `.output/`, not source (Bun runtime uses source via the `build` map, but `tsc` does not). After changing platform exports, run `bun run build` **before** typechecking downstream packages. `organization` and `management` also have `build` steps.

docs (`bun run dev` → 3005):

```
bun run dev             # vite dev --port 3005
bun run check:types     # fumadocs-mdx && tsc --noEmit
bun run build           # bun gen:cf-types && vite build
bun run deploy          # wrangler deploy (Cloudflare Workers, wrangler.jsonc)
```

**docs gotchas**: `ignore-scripts=true` blocks the `postinstall` (`fumadocs-mdx`) — run `bunx fumadocs-mdx` manually if `.source/` is missing before build/typecheck. `check:lint` is `biome check` (no `--fix`, unlike others).

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

Every implemented module (management, organization, compliance, tasks, drive, hr) follows the same shape:

- `src/module.ts` holds the class (implements `Module`, static `create`, `readonly $name`/`$dependencies`/`$config`, `$prepareInfra()` returning `{ auth: { acl }, db: { control_plane_schemas, tenant_schemas }, events }`); `src/index.ts` just re-exports.
- `src/auth.ts` holds the ACL (`defineAcl(...)`); `src/pubsub.ts` holds events; `src/types.ts` re-exports constants + events + schemas; `db-schemas/` is directory form (one file per table + `enums.ts`); workflows are one file per action under `workflows/<entity>.<action>.ts` with reusable steps in `workflows/steps/`.
- Workflow groups: stateless `readonly` properties composed from imported per-workflow consts; a `#db` getter (management hybrid) only when a workflow is bound to a unit at construction time (`createX(this.#db)`).

Modules with non-empty runtime wiring (compliance schedules/handlers, drive purge cron, hr scheduled jobs, management tenant onboarding) keep `#private` unit refs set in `$initialize(units)` plus `async $prepareRuntime()` / `async $cleanup()` that register/unregister pubsub schedules; their workflow groups stay `readonly`.

`$initialize()` signatures vary by module — each types its own unit subset: organization/tasks take none; compliance takes `{ db, kvStore, pubsub }`; drive `{ db, storage, pubsub }`; management `{ db, auth, pubsub }`; hr `{ db, pubsub }`. management's `$name` is `"management"` (proxy `p.management`), `$dependencies: ["organization"]`.

### Database (Drizzle)

- IDs: `text` with `DEFAULT uuidv7()` (never native UUID). Exception: better-auth tables use `text("id").primaryKey()` without default, and `audit_log.id` uses `uuid().default(sql\`gen_random_uuid()\`)`.
- Timestamps: `timestamp(..., { withTimezone: true })`; `createdAt` `.notNull().defaultNow()`, `updatedAt` `.notNull().defaultNow().$onUpdate(() => new Date())`.
- Table/column names `snake_case` in Postgres, `camelCase` in TS (drizzle maps). Columns sorted alphabetically by TS property name. Tables `snake_case`.
- `text` arrays, `jsonb("metadata")`, `numeric` for money, `bigint(..., { mode: "number" })` for sizes, `text("user_id").references(() => user.id, { onDelete: "cascade" })`.
- Schema pushed via `pushSchema()` from `drizzle-kit/api` — **not migration files** (ADR 0004).

### Validation

- **Valibot** for domain-module input: `Create<Entity>Schema` / `Update<Entity>Schema` / `<Entity>FiltersSchema`; types via `InferOutput`. Co-export separate `export type` and `export` blocks.
- **Zod** for oRPC RPC procedure inputs and env vars (t3-env).
- Constants as `as const` objects, `UPPER_SNAKE` keys, lowercase string values; shared in `@aspen-os/constants`, module-specific in `constants.ts`.
- Events `"domain:event_name"`, typed via `EventMap`, published as plain string topics. No `Result<T,E>` / `PaginatedResult` types — don't create them.

### TypeScript / Biome

Root `tsconfig.json` (extended everywhere, `composite: true` project references): `strict`, `verbatimModuleSyntax` (use `import type`), `noUncheckedIndexedAccess`, `noUnusedLocals` (params allowed), `moduleResolution: "bundler"`, `module/target: ESNext`, `types: ["bun", "@types/bun"]`.

- **Path-alias gotcha**: each package maps `@/*` to its own `./src/*`. Root tsconfig has no `paths`. Run `tsc -b` in the package whose alias you mean.
- **Biome** (`biome.json`): double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports (`sortBareImports: true`, alias/URL import groups). Tailwind `useSortedClasses: "error"`. `src/components/ui/**` has linting disabled (shadcn).

### Git hooks (Husky, active)

- `pre-commit`: `bunx lint-staged` → `biome format --fix --no-errors-on-unmatched`.
- `commit-msg`: `commitlint` — types `build chore ci docs feat fix perf refactor revert test wip`.

## Important Files

| File | Purpose |
|---|---|
| `packages/platform/src/server/index.ts` | Server barrel: `Unit`/`Module`/`ModuleInfra`/`PlatformInstance`, three platform classes, workflows, `getContext`, `defineAcl`, `isGlobalTenantId` |
| `packages/platform/src/server/base-platform.ts` | `BasePlatform` (Proxy, `createCore`, `$prepareInfra`, `run`, `$cleanup`, `healthCheck`) |
| `packages/platform/src/server/{create-single,create-shared,create-isolated}-tenant.ts` | The three platform classes |
| `packages/platform/src/server/db/index.ts` + `unit.ts` | `DatabaseUnit` — pool, `db`/`controlPlaneDb`, tenancy, RLS, `prepareWithModules`, `getSchemas` |
| `packages/platform/src/server/auth/index.ts` | `AuthUnit` — better-auth service, `fetchHandler`, `applyModuleAcl`, `_` getter, `defineAcl` |
| `packages/platform/src/server/pubsub/index.ts` | `PubSubUnit` — single control-plane pg-boss (lazy-started); see pubsub pitfalls below |
| `packages/platform/src/server/workflows/` | `Workflow` / `WorkflowStep` durable step runner (`workflow_runs`/`workflow_steps` tables) |
| `packages/platform/src/cli/index.ts` | `aspen` CLI — `db-studio`, `tenants`; dynamically imports config (`platform` or `p` export) |
| `scripts/build.ts` | Package builder: rewrites `exports`/`bin` → `.output/`, runs `Bun.build()` + `tsc` declarations |
| `docs/src/routes/docs/$.tsx` | Docs catch-all route — Fumadocs layout, server fn loader |
| `docs/source.config.ts` | Fumadocs docs sources — each package's `docs/` dir (`packages/*/docs`, e.g. `platform`, `organization`, `hr`) |
| `biome.json`, `tsconfig.json`, `bunfig.toml`, `.commitlintrc.json` | Toolchain config |

### `_` getter (server AuthUnit)

`AuthUnit._` exposes a REST `resource.action` API: `user.{create, get, remove, update, role.{assign, unassign}}`, `session.{create, invalidate, validate}`, `role.{list, remove}`. The `service` getter returns the full better-auth `AuthService` (`betterAuth` instance with `.api` for admin/organization plugin endpoints). Use `remove`, not `delete`. `applyModuleAcl(acl)` re-creates the service with `admin({ ac: createAccessControl(acl) })` during `prepareInfra()`.

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
- **TypeScript**: `typescript` catalog `^7.0.2`. **Validation**: valibot (domain), zod (RPC/env). **ORM**: drizzle-orm `^0.45.2` + `pg`. **Auth**: better-auth `^1.6.25` (+ api-key, passkey, admin, organization plugins). **Pub/Sub**: pg-boss `^10.4.2`. **RPC**: oRPC (`@orpc/server`). **Storage**: AWS S3 SDK (SeaweedFS-compatible). Telemetry: `@opentelemetry/api`, logs via pino.
- **Root `workspaces.catalog`**: `@standard-schema/spec`, `@standard-schema/utils`, `@types/bun`, `bun`, `drizzle-orm`, `typescript`, `valibot` — referenced as `catalog:`.
- **`bunfig.toml`**: `ignore-scripts=true`, `minimumReleaseAge=259200` (3 days; excludes `@types/bun`/`typescript`/`@biomejs/biome`), `saveTextLockfile=false`.
- **Env (docs)**: `docs/.env.local` — `OPENROUTER_API_KEY`, optional `CLOUDFLARE_*` (account ID, API token, S3 credentials for the AI chat feature).
- **Infra (docker-compose)**: `packages/platform/src/server/example.docker-compose.yaml` — Postgres `postgres:18-alpine` on 5432 (user `aspen`, password `change-me`, RLS disabled via `row_security=off`). No SeaweedFS/storage service is defined in the repo.
- **No CI/CD** beyond `docs`'s `wrangler.jsonc` (deploy via `wrangler deploy`).

## Testing & QA

- **Status: effectively no test infrastructure.** No test files, no test config (`vitest.config.*` / `jest.config.*` / `playwright.config.*`), no `__tests__`/`fixtures`/`mocks` directories anywhere in the repo.
- No test scripts in any package. No coverage config; `.zed/settings.json` pre-excludes `**/.coverage`.
- No dedicated type-check/test gate in CI (there is no CI). Quality checks are `check:lint` (biome) and `check:types` (`tsc -b`) per package.

## Pub/Sub Pitfall (pg-boss)

`PubSubUnit.publish` delegates to pg-boss `send()`, which runs `INSERT … SELECT … JOIN queue … ON CONFLICT DO NOTHING RETURNING id`. If a topic has **no queue row** (no consumer has called `subscribe()` → `boss.work()`), the INSERT matches nothing and `send()` returns `null` — the message is silently dropped. Treat a null return as "not inserted": `publish()` should throw a verbose error pointing at a missing topic queue/worker. A topic with only producers is the classic silent-drop. The single control-plane boss must be started lazily on first use (not in `$prepareInfra()`); health-check connectivity uses `boss.getQueueSize(topic)`, not `send()`.

## Current State

`organization`, `compliance`, `tasks`, `drive`, `management`, `hr` fully implemented and aligned to the management module structure (module.ts/auth.ts/pubsub.ts, db-schemas/, one workflow per file + steps/). `accounting`/`crm`/`fleet`/`inventory`/`pharmacy`/`reports` are stubs. No tests, no CI, no platform Docker/deployment config.
