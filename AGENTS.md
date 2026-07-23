# @aspen-os

Bun monorepo. A business framework (`@aspen-os/framework`) with pluggable units/modules and multi-tenancy, plus a TanStack Start example app and a docs site.

## Runtime & Toolchain

- **Runtime**: Bun (not Node.js). **Package manager**: Bun workspaces (`bun install`).
- **Language**: TypeScript, ESM only (`"type": "module"`). `verbatimModuleSyntax: true`, bundler resolution, `strict` + `noUncheckedIndexedAccess` + `noUncheckedSideEffectImports` + `noUnusedLocals: true` + `noUnusedParameters: false`.
- **Linter/formatter**: Biome (`biome.json` at root) — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports. Tailwind `useSortedClasses` is `error`.
- **`bunfig.toml`**: install scripts disabled (`ignore-scripts=true`), 3-day minimum release age (`minimumReleaseAge=259200`, excludes `@types/bun`/`typescript`/`@biomejs/biome`), lockfile not saved as text.
- **Workspace catalog**: shared dep versions pinned in root `package.json` `workspaces.catalog` (`@types/bun`, `bun`, `drizzle-orm`, `typescript`, `valibot`); referenced as `catalog:` in packages. `typescript` is `7.0.2`.
- **Path-alias gotcha**: each package's tsconfig maps `@/*` to its own `./src/*`. Root tsconfig has no `paths` field. Run typecheck in the package whose alias you mean.

## Commands

```
bun install                                    # install all workspace deps
bun run check:lint                             # biome check --fix . (root)
bun run check:types                            # tsc -b (root tsconfig)
bun run update:deps                            # taze -rw --maturity-period 3
cd packages/framework && bun run check:types   # typecheck framework
cd packages/framework && bun run check:lint    # biome check --fix . (framework)
cd packages/framework && bun run build         # build .output/ (required before bun publish)
```

No build/test/format scripts at root. Each domain package has `check:lint` and `check:types` scripts.

**recruiter** (`examples/recruiter`, scripts use `app:` prefix):
```
cd examples/recruiter && bun run app:dev          # vite dev --port 3000
cd examples/recruiter && bun run app:build        # vite build
cd examples/recruiter && bun run app:prepare       # bun scripts/prepare.ts (calls f.prepare())
cd examples/recruiter && bun run app:preview       # vite preview
cd examples/recruiter && bun run db:studio         # aspen db-studio --config=src/aspen/server.ts (port 4983)
cd examples/recruiter && bun run generate-routes   # tsr generate (TanStack Router)
cd examples/recruiter && bun run check:lint        # biome check --fix .
cd examples/recruiter && bun run check:types       # tsc -b
```

**docs-www** (`bun run dev` → port 3005). `check:types` runs `fumadocs-mdx && tsc --noEmit`; `build` runs `bun gen:cf-types && vite build`; `deploy` runs `wrangler deploy` (uses `wrangler.jsonc`, `nodejs_compat` flag). **Gotcha**: `ignore-scripts=true` in `bunfig.toml` blocks the `postinstall` (`fumadocs-mdx`) — run `bunx fumadocs-mdx` manually before `bun run build`/`check:types` if `.source/` is missing. Note: docs-www `check:lint` is `biome check` (no `--fix`, unlike other packages).

**Framework build gotcha**: the framework's `exports` field points at `.output/` (built JS + `.d.ts`). TypeScript resolves types from `.output/`, not source. After changing framework exports, run `cd packages/framework && bun run build` before typechecking downstream packages (e.g. recruiter). The `build` field in `package.json` maps exports to source `.ts` for Bun runtime resolution (in-workspace dev needs no build), but **TypeScript still uses `.output/` for type resolution**.

## Git Hooks (Husky)

Hooks **are** active via `.husky/`:
- **pre-commit**: `bunx lint-staged` → runs `biome format --fix --no-errors-on-unmatched` on staged files.
- **commit-msg**: `bunx commitlint --edit $1` → enforces conventional commits (`.commitlintrc.json`).

Allowed commit types: `build chore ci docs feat fix perf refactor revert test wip`.

## Project Structure

```
packages/
  framework/          # Core library — units, modules, tenancy, CLI (only package with a build step)
  organization/       # Domain module (5 workflows, 7 tables)
  compliance/         # Domain module (5 workflows, 3 services)
  tasks/              # Domain module (11 workflows, 2 services)
  drive/              # Domain module (6 workflows, 5 services)
  management-plane/    # Domain module — control plane (5 workflows: tenant, service-provider, platform-user, report, provisioning)
  constants/          # Shared enums and constants (@aspen-os/constants)
  hr/                 # Scaffold — has package.json + src, but module class is incomplete (TODOs)
  accounting/ crm/ fleet/ inventory/ pharmacy/ reports/  # Pure stubs (package.json is just { "name": "..." })
examples/
  recruiter/          # TanStack Start + React 19 + Vite 8 + Tailwind 4 app (dev port 3000)
docs-www/             # TanStack Start docs site → Cloudflare Workers (fumadocs)
docs/                 # adr/, BOUNDED_CONTEXTS.md, DOMAIN_MODEL.md, TODO.md, sow/
```

Root also has `CODING_CONVENTIONS.md` and `CONTEXT.md` with full domain language and anti-patterns. **Read these before modeling domain changes.** Note: `CODING_CONVENTIONS.md` has some stale references to the old server `Framework` class — trust the code over that doc for server framework architecture.

Workspace globs: `./packages/*`, `./examples/*`, `./docs-www`. Root `tsconfig.json` uses composite project references to all packages. `codedb.snapshot` at root is a CodeDB indexing artifact, not source (gitignored).

## App Setup (recruiter)

- **Docker Compose** (`examples/recruiter/docker-compose.yaml`): starts **Postgres** (`postgres:18-alpine`, port 5432, user/pass/db all `recruiter`) and **SeaweedFS** (S3-compatible: master 9333, volume 8080, filer 8888, S3 8333).
- Reads `.env.local` (gitignored). Key vars: `DB_*`, `AUTH_SECRET`, `STORAGE_*` (endpoint `http://localhost:8333`), `GOOGLE_CLIENT_*`, `PUBLIC_WEB_*`.
- Framework config lives in `examples/recruiter/src/aspen/`: `server.ts` (`SingleTenantPlatform.create`), `auth.ts` (access control + roles), `client.ts`.
- Env validated via `@t3-oss/env-core` with Zod (`examples/recruiter/src/env.ts`). Vite env prefix is `PUBLIC_`.
- **`aspen` CLI** (framework `bin`): `aspen db-studio --config=<path>` dynamically imports the framework config (looks for a `framework` or `f` export) and launches Drizzle Kit Studio (default port 4983).

## Framework Architecture (`packages/framework`)

Three entry surfaces: `./src/server/` (Node/Bun), `./src/client/` (browser), `./src/cli/` (commander-based CLI, exposed as `aspen` bin). There is **no `src/index.ts`** barrel.

### Package exports & build

`@aspen-os/framework` declares only `./client` and `./server` — **no `.` entry**, so bare `@aspen-os/framework` does not resolve. Always import via subpaths.

- `@aspen-os/framework/server` — three platform classes, `Unit`, `Module`, `FrameworkInstance`, all config types, all unit classes.
- `@aspen-os/framework/client` — client `Framework` class, `createAccessControl` (re-exported from `better-auth/plugins/access`), client config types.

**Build step (framework only):** the framework's published `exports` and `bin` point at `./.output/` (built JS + `.d.ts`, gitignored). A `build` field in `package.json` maps those same keys to source `.ts` so **Bun runtime resolves to source with no build**. But TypeScript resolves types from `.output/` — run `bun run build` after changing exports. **Domain modules have no build step** — their `exports` point at raw `.ts`.

### Server: three separate platform classes

The server exports **three self-contained classes** — there is no shared base class or single `Framework` class on the server side. Each lives in its own file and contains its own constructor, proxy, `create()`, `prepare()`, `run()`, `destroy()`, `getModule()`, `getUnit()`:

| Class | File | `run()` signature | Config type |
|---|---|---|---|
| `SingleTenantPlatform` | `create-single-tenant.ts` | `run(fn)` | `SingleTenantConfig` |
| `SharedTenantPlatform` | `create-shared-tenant.ts` | `run(tenantId, fn)` | `SharedTenantConfig` |
| `IsolatedTenantPlatform` | `create-isolated-tenant.ts` | `run(tenantId, fn)` | `IsolatedTenantConfig` |

```ts
import { SingleTenantPlatform } from "@aspen-os/framework/server"

const f = SingleTenantPlatform.create(
  { auth, db, kvStore, logs, pubsub, rpc, storage },
  { organization: orgModule },
)
await f.prepare()
await f.run(async () => { /* ctx: { auth, db, pubsub } via getContext() */ })
await f.destroy()
```

API facts:
- **Config does not include `tenancy`** — the platform choice implies the mode. Each `create()` constructs the tenancy config internally.
- `IsolatedTenantConfig` adds `resolver: TenantResolver` (the only config that takes extra fields).
- `run()` signatures are **not overloaded** — `SingleTenantPlatform.run` only accepts `run(fn)`; shared/isolated only accept `run(tenantId, fn)`. The type system enforces correct usage.
- All three classes return proxy-wrapped instances. Module `$name`s and unit keys become proxy accessors: `f.organization`, `f.db`, `f.auth`, etc.
- `FrameworkInstance<M>` is a **structural type** (not tied to a specific class) used by the CLI for dynamic loading. Use the platform-specific instance types (`SingleTenantPlatformInstance<M>`, etc.) for typed access including `run()`.
- Shared types (`Unit`, `Module`, `FrameworkUnits`, `UnitAccessors`, `ModuleAccessors`) are defined in `src/server/index.ts`. Each platform file imports them via `import type`.

### Client: single `Framework` class

The client (`src/client/index.ts`) still has a single `Framework` class with `Framework.create(config, modules)`. It has 3 units (`auth`, `logs`, `rpc`), no tenancy, no DB. Uses `$` prefix on lifecycle methods like the server.

### Units vs Modules

- **Unit**: `{ readonly $name: string; $cleanup(): Promise<void>; $prepare?(): Promise<void> }` — `$` prefix on all lifecycle methods.
- **Module**: `{ readonly $name: N; $initialize?(units: Record<string, Unit>): void; $prepare?(): Promise<void>; $prepareTenant?(tenantId: string): Promise<void>; $cleanup(): Promise<void> }`.
- Both interfaces are defined in `src/server/index.ts` and `src/client/index.ts` — no separate types file.

### Multi-tenancy

- **Single**: one DB, no tenant scoping. `run(fn)`. No mode-specific `prepare()` logic.
- **Shared**: one DB with row-level security. `prepare()` applies RLS policies via `DatabaseUnit.applyRlsPolicies()`. `run(tenantId, fn)` opens a transaction, sets `app.tenant_id` + `SET LOCAL ROLE tenant_role`, creates a per-call drizzle instance.
- **Isolated**: DB-per-tenant. Requires `TenantResolver` (`{ list(), resolve(tenantId) → DatabaseConfig }`). `prepare()` iterates tenants and calls `$prepareTenant()` per module. `run(tenantId, fn)` resolves and connects to the tenant DB.

`DatabaseUnit` exposes `tenancyMode`, `controlPlaneDb`, `resolver`, `pool`, `applyRlsPolicies()`. `f.tenancyMode` reads through to the db unit.

### Core units (created by each platform's `create()` via `new`)

All are classes with constructor-injected deps:

| Unit | Class | Path | Injected deps |
|---|---|---|---|
| db | `DatabaseUnit` | `src/server/db/` | `config.db`, tenancy config (owns `pg.Pool` + drizzle `db` + tenancy state) |
| logs | `LogUnit` | `src/server/log/` | `{ db }` |
| pubsub | `PubSubUnit` | `src/server/pubsub/` | `{ db }` (also wired to `auth` via `pubsub.setAuth()` / `auth.setPubSub()`) |
| storage | `StorageUnit` | `src/server/storage/` | `{ db }` |
| auth | `AuthUnit` | `src/server/auth/` | `{ db }` |
| rpc | `RpcUnit` | `src/server/rpc/` | `{ auth, db, logs, pubsub }` |
| kvStore | `KvStoreUnit` | `src/server/kv-store/` | `{ db }` |

Server `src/server/` also has `tenancy/`, `workflows/`, `context.ts`, `bun-compat.ts`. Client `src/client/` has `auth`, `rpc`, `log`, `context.ts` only.

### Auth unit shape (server)

`AuthUnit` exposes: `$db_schema` (auth Drizzle schema), `auth` (raw betterAuth `Auth` instance), `fetch_handler(request)`, `user` getter (`{ create, delete, get, update, role: { assign, unassign } }`), `session` getter (`{ create, validate, invalidate }`), `role` getter (`{ list, delete }`).

`AuthConfig` requires: `access_control`, `roles`, `baseURL`, `secret`, `session{expiresIn?}`; optional `socialProviders.google`. These are passed to betterAuth via the `admin()` plugin.

## Domain Module Pattern

Modules follow a strict pattern (see `organization`, `compliance`, `tasks`, `drive`, `management-plane` for reference):
- Static `create(config)` factory. Private workflow fields with `#` prefix, initialized lazily in `$initialize(units)`.
- Getter properties that throw `notInitialized()` if accessed before `$initialize()`.
- `db_schema` export (drizzle schema namespace). `$name` as a readonly string (kebab-case or camelCase).
- `$prepare()` is optional — pushes module DB schemas via `pushSchema()` and/or registers pubsub handlers/schedules. `$cleanup()` nulls out fields and unregisters.
- File structure: `src/{index,db-schema,types,event-map,constants}.ts`, `src/schemas/`, `src/workflows/`, optionally `src/services/`.
- Package: `@aspen-os/<module>`, `"type": "module"`, `exports: { ".": "./src/index.ts" }`, deps on framework + constants via `workspace:*`.
- **Module `$initialize()` signatures vary** — each module types its own subset of units: organization/tasks take `{ db, pubsub }`; compliance takes `{ db, kvStore, pubsub }`; drive takes `{ db, storage, pubsub }`; **management-plane takes `{ db, auth, pubsub }`**.

## Conventions

- DB IDs are `text` with `DEFAULT gen_random_uuid()::text` (not native UUID). Exception: better-auth tables use `text("id").primaryKey()` without a default.
- Timestamps use `TIMESTAMPTZ` / `withTimezone: true`. `createdAt`: `.notNull().defaultNow()`. `updatedAt`: `.notNull().defaultNow().$onUpdate(() => new Date())` or manually set in workflows.
- Table names: `snake_case`. Column names: `snake_case` in Postgres, `camelCase` in TS (drizzle maps). Columns sorted alphabetically by TS property name.
- **Validation**: Valibot for domain module input. Zod for RPC procedures (oRPC) and env vars (t3-env).
- **No barrel files** unless explicitly told (`CODING_CONVENTIONS.md`).
- **No build step** for domain modules — `exports` point at raw `.ts`. (Framework is the exception.)
- `*.gen.ts` and `worker-configuration.d.ts` are gitignored (codegen output).
- Constants as `as const` objects with `UPPER_SNAKE` keys and lowercase string values. Shared in `@aspen-os/constants`, module-specific in `constants.ts`.
- Events: `"domain:event_name"` format, typed via `EventMap` type. Published via PubSub as plain string topics.
- There is no `Result<T,E>` or `PaginatedResult` type — don't use or create them.
- See `CODING_CONVENTIONS.md`, `CONTEXT.md`, and `docs/DOMAIN_MODEL.md` for full domain language and anti-patterns.

## Current State

- `organization`, `compliance`, `tasks`, `drive`, and `management-plane` are fully implemented domain modules. `hr` is a scaffold. All other domain packages are pure stubs.
- No CI/CD, no Docker for the framework, no deployment config beyond `docs-www`'s `wrangler.jsonc`.
- No tests for the framework or domain modules. `recruiter` has `vitest` + `@testing-library` in devDeps but no `test` script.
