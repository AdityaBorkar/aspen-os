# Repository Guidelines

## Project Overview

`@aspen-os` is a Bun monorepo containing a business framework (`@aspen-os/platform`) with pluggable **units** (infrastructure) and **modules** (domain logic), first-class multi-tenancy, plus a TanStack Start example app (`recruiter`) and a Fumadocs docs site (`docs-www`).

Workspace state:

- **Fully implemented**: `platform`, `organization`, `compliance`, `tasks`, `drive`, `management-plane` (modules), `constants` (shared enums).
- **Partial**: `hr` — module logic largely written but the class does not `implements Module` and lacks `$prepareRuntime()`.
- **Pure stubs**: `accounting`, `crm`, `fleet`, `inventory`, `pharmacy`, `reports` (package.json is just `{ "name": "..." }`).

Read `CODING_CONVENTIONS.md`, `CONTEXT.md`, and `docs/DOMAIN_MODEL.md` before modeling domain changes. Note: `CODING_CONVENTIONS.md` still references the old server `Framework` class — trust the code over that doc for server architecture; `CONTEXT.md` documents known gaps.

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
                       # units: db/ auth/ logs/ pubsub/ storage/ rpc/ kv-store/ audit/,
                       # workflows/, utils/ (context.ts, bun-compat.ts, is-global-tenant-id.ts)
    src/client/        # Platform class + auth/ logs/ rpc + context.ts, types.ts
    src/cli/           # commander CLI (db-studio, tenants)
  constants/           # Shared enums (country-codes.ts, languages.ts)
  organization/        # Domain module (build step) — db-schemas/ schemas/ utils/acl.ts workflows/ pubsub-events.ts
  compliance/          # Domain module — + services/ constants.ts
  tasks/               # Domain module — + services/ utils/filter-engine.ts (17 tables)
  drive/               # Domain module — + services/ runtime.ts
  management-plane/    # Control-plane module (build step) — module.ts auth.ts pubsub.ts workflows/steps/
  hr/                  # Partial — db-schema.ts (single file) event-map.ts constants.ts
  accounting/ crm/ fleet/ inventory/ pharmacy/ reports/   # stubs
examples/
  recruiter/           # TanStack Start + React 19 + Vite 8 + Tailwind 4 (port 3000)
    src/aspen/         # server.ts, auth-client.ts, client.ts
    src/env.ts         # @t3-oss/env-core + Zod validation
    scripts/prepare.ts # calls p.$prepareInfra()
docs-www/              # TanStack Start docs → Cloudflare Workers (fumadocs; port 3005)
docs/                  # adr/ BOUNDED_CONTEXTS.md DOMAIN_MODEL.md TODO.md sow/
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

**Build gotcha**: platform's published `exports`/`bin` point at `.output/`. TypeScript resolves types from `.output/`, not source (Bun runtime uses source via the `build` map, but `tsc` does not). After changing platform exports, run `bun run build` **before** typechecking downstream packages. `organization` and `management-plane` also have `build` steps.

recruiter (`examples/recruiter`, `app:` prefix):

```
bun run app:dev          # vite dev --port 3000
bun run app:build        # vite build
bun run app:preview      # vite preview
bun run app:prepare      # bun scripts/prepare.ts (p.$prepareInfra())
bun run generate-routes  # tsr generate (TanStack Router)
bun run db:studio        # aspen db-studio --config=src/aspen/server.ts (port 4983)
```

docs-www (`bun run dev` → 3005):

```
bun run dev             # vite dev --port 3005
bun run check:types     # fumadocs-mdx && tsc --noEmit
bun run build           # bun gen:cf-types && vite build
bun run deploy          # wrangler deploy (Cloudflare Workers, wrangler.jsonc)
```

**docs-www gotchas**: `ignore-scripts=true` blocks the `postinstall` (`fumadocs-mdx`) — run `bunx fumadocs-mdx` manually if `.source/` is missing before build/typecheck. `check:lint` is `biome check` (no `--fix`, unlike others).

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

### Two domain-module patterns

- **Newer** (organization, tasks, management-plane): workflows are `readonly` properties; `$initialize()` / `$prepareRuntime()` / `$cleanup()` are empty.
- **Older** (compliance, drive, hr): `#private` workflow fields set in `$initialize(units)`; getters that throw `notInitialized()` if accessed early; non-empty `$prepareRuntime()` (pubsub schedules/handlers) and `$cleanup()` (unregister + null out).

`$initialize()` signatures vary by module — each types its own unit subset: organization/tasks take none; compliance takes `{ db, kvStore, pubsub }`; drive `{ db, storage, pubsub }`; management-plane `{ db, auth, pubsub }`. Management-plane's `$name` is `"management"` (proxy `p.management`), `$dependencies: ["organization"]`.

### Database (Drizzle)

- IDs: `text` with `DEFAULT gen_random_uuid()::text` (never native UUID). Exception: better-auth tables use `text("id").primaryKey()` without default.
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
| `examples/recruiter/src/aspen/server.ts` | `SingleTenantPlatform.create`, exports `p` (config target for CLI) |
| `examples/recruiter/src/env.ts` | `@t3-oss/env-core` + Zod env validation; client prefix `PUBLIC_` |
| `docs-www/src/routes/docs/$.tsx` | Docs catch-all route — Fumadocs layout, `getLayoutTabs`, server fn loader |
| `biome.json`, `tsconfig.json`, `bunfig.toml`, `.commitlintrc.json` | Toolchain config |

### `_` getter (server AuthUnit)

`AuthUnit._` exposes a REST `resource.action` API: `user.{create, get, remove, update, role.{assign, unassign}}`, `session.{create, invalidate, validate}`, `role.{list, remove}`. Public `user`/`session`/`role` getters delegate to slices of `_`. Use `remove`, not `delete`. `admin` returns `betterAuth.api` (admin/organization plugin endpoints). `applyModuleAcl(acl)` re-creates the service with `admin({ ac: createAccessControl(acl) })` during `prepareInfra()`.

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
- **Env (recruiter)**: `.env.local` with `DB_*`, `AUTH_SECRET`, `STORAGE_*`, `GOOGLE_CLIENT_*`, `PUBLIC_WEB_*`. Vite exposes only `PUBLIC_`-prefixed vars.
- **Infra (recruiter, docker-compose)**: Postgres `postgres:18-alpine` (5432) + SeaweedFS (master 9333, volume 8080, filer 8888, S3 8333, S3 config `seaweedfs-s3.json`).
- **No CI/CD** beyond `docs-www`'s `wrangler.jsonc` (deploy via `wrangler deploy`).

## Testing & QA

- **Status: effectively no test infrastructure.** No test files, no test config (`vitest.config.*` / `jest.config.*` / `playwright.config.*`), no `__tests__`/`fixtures`/`mocks` directories anywhere in the repo.
- `examples/recruiter` has unused devDeps `vitest@4.1.10`, `@testing-library/react@16.3.2`, `@testing-library/dom`, `jsdom` but **no `test` script** to invoke them.
- No test scripts in any package. No coverage config; `.zed/settings.json` pre-excludes `**/.coverage`.
- No dedicated type-check/test gate in CI (there is no CI). Quality checks are `check:lint` (biome) and `check:types` (`tsc -b`) per package.

## Pub/Sub Pitfall (pg-boss)

`PubSubUnit.publish` delegates to pg-boss `send()`, which runs `INSERT … SELECT … JOIN queue … ON CONFLICT DO NOTHING RETURNING id`. If a topic has **no queue row** (no consumer has called `subscribe()` → `boss.work()`), the INSERT matches nothing and `send()` returns `null` — the message is silently dropped. Treat a null return as "not inserted": `publish()` should throw a verbose error pointing at a missing topic queue/worker. A topic with only producers is the classic silent-drop. The single control-plane boss must be started lazily on first use (not in `$prepareInfra()`); health-check connectivity uses `boss.getQueueSize(topic)`, not `send()`.

## Current State

`organization`, `compliance`, `tasks`, `drive`, `management-plane` fully implemented; `hr` substantially implemented (infra + lifecycle wired but not conformant — see Overview). `accounting`/`crm`/`fleet`/`inventory`/`pharmacy`/`reports` are stubs. No tests, no CI, no platform Docker/deployment config.
