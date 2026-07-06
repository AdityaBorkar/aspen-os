# @openbiz-framework

Bun monorepo. Business framework with pluggable domain units and presets.

## Runtime & Toolchain

- **Runtime**: Bun (not Node.js)
- **Package manager**: Bun workspaces (`bun install`)
- **Language**: TypeScript, ESM only (`"type": "module"`)
- **tsconfig**: `noEmit: true`, `verbatimModuleSyntax: true`, bundler module resolution
- **Linter/formatter**: Biome (`biome.json` at root) — double quotes, 2-space indent, LF, organized imports
- Root `package.json` has TypeScript `^7.0.1-rc`; framework package pins `^5.7.2`
- `bunfig.toml` disables install scripts (`ignore-scripts=true`), enforces 3-day minimum release age for deps

## Commands

```
bun install                                    # install all workspace deps
cd packages/framework && bun run check:types   # typecheck framework (tsc --noEmit)
bun run check:lint                             # biome check --fix (from root)
bun run check:types                            # tsc --noEmit (from root)
```

No test, build, or format scripts are defined anywhere yet.

## Commit Conventions

`commitlint.config.ts` defines conventional commit types but the `@commitlint` package is not installed and no git hooks are active. Treat as aspirational convention, not enforced. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `test`, `wip`.

## Project Structure

```
packages/
  framework/    # Core library — the only package with real code
  hr/           # Stub (name-only package.json, no source)
  analytics/    # Empty
  banking/      # Empty
  reports/      # Empty
examples/
  recruiter/    # TanStack Start + React 19 + Vite 8 + Tailwind 4 app
documentation/  # TanStack Start docs site, deploys to Cloudflare Workers
```

Only `packages/framework` has deps, scripts, and source code. Workspace globs: `./packages/*`, `./examples/*`, `./documentation`.

## Framework Architecture (`packages/framework`)

### Terminology: Units vs Modules

The codebase distinguishes between **Units** and **Modules**:

- **Unit**: Internal, primary building blocks necessary for the framework to operate. Units provide the foundational infrastructure (auth, pubsub, rpc, sync, storage, notification, logs). The `Unit` interface and `UnitDeps` are in `src/types.ts`. All factory functions are `createXUnit`.

- **Module**: Optional business functionality defined in separate packages (e.g., `hr`, `analytics`, `banking`, `reports`). Modules depend on units and receive `ModuleDeps` which provides access to core units. The `Module` interface and `ModuleDeps` are in `src/types.ts`.

### Entrypoints

- `src/framework.ts` — `Framework` class. Orchestrates unit lifecycle: `new Framework(config)` → `framework.initialize()` → `framework.run(fn)` → `framework.destroy()`.
- `src/index.ts` — barrel re-exporting **types only** (not factory functions). Use subpath imports for factories.
- `src/db/index.ts` — `getPool()` and `createDrizzle()`.
- `src/context.ts` — `AsyncLocalStorage` providing `{ db, pubsub }` per request.
- `src/types.ts` — shared interfaces: `Unit`, `UnitDeps`, `DatabaseConfig`, `Result`, `PaginatedResult`.

### Framework Usage Pattern

```ts
import { Framework } from "@aspen-os/framework"
import { createAuthUnit } from "@aspen-os/framework/auth"

const framework = new Framework({
  db: { host, port, user, password, database },
  auth: { /* better-auth config + roles + access_control */ },
})
framework.registerModules([hrModule, driveModule])
await framework.initialize()
await framework.run(async () => {
  // code runs inside AsyncLocalStorage context with db + pubsub
})
await framework.destroy()
```

`framework.run()` provides `{ db, pubsub }` via `AsyncLocalStorage` — all calls inside share the same DB connection and pubsub instance. `framework.registerModules(modules)` adds business modules **before** `initialize()`. Calling `registerModules()` after `initialize()` throws. Modules receive `ModuleDeps` which extends `UnitDeps` with access to `auth` and `rpc` units.

### Core Units

**Core units** are created internally by `Framework` based on config — do not instantiate them yourself:
- **auth**: `createAuthUnit`. Users, roles, permissions, sessions via `better-auth`. Drizzle schemas in `auth/db-schema/`. Workflows in `auth/workflows/` (user.ts, role.ts, session.ts).
- **pubsub**: `createPubSubUnit`. Database-backed pub/sub via `pg-boss`. Creates its own tables.
- **rpc**: `createRpcUnit`. RPC via `@orpc/server`. Exposes `router` and `handler`.
- **sync**: `createSyncUnit`. Stub (not yet implemented).

### Extra Units

**Extra units** — register via `framework.registerModules()`:
- **storage**: `createStorageUnit`. S3 via `@aws-sdk/client-s3`. Has schema.ts + service.ts.
- **notification**: `createNotificationUnit`. Multi-provider notifications. Has schema.ts + service.ts.
- **logs**: `createLoggingUnit`. Structured logging with buffer + TimescaleDB hypertable. Has buffer.ts, schema.ts, service.ts.

**Internal** (not exported):
- **kv-store**: `PostgresKvStore` / `createKvStore` in `src/kv-store/`. Not a subpath export.

### Unit Interface

Every unit follows: `createXUnit(config) → XUnit & Unit`. The `Unit` interface requires `name`, `initialize(deps)`, `destroy()`, `healthCheck()`. `UnitDeps` provides `{ db, pool, pubsub }`. Units with DB state create their own tables via raw SQL in `initialize()`.

Directory layout for units:
```
src/<name>/
  index.ts       # factory function + public re-exports
  types.ts       # interfaces
  schema.ts      # Drizzle ORM table definitions (pgTable)
  service.ts     # internal DB operations
```

### Module Interface

Modules follow the same shape as units but receive `ModuleDeps` which extends `UnitDeps` with access to core units:
- `auth: AuthUnit` — access to auth workflows and server
- `rpc: RpcUnit` — access to RPC router/handler

Modules are defined in separate packages (e.g., `packages/hr`) and registered via `framework.registerModules()`.

### Accessing Units

```ts
// Typed getters for core units (throw if not initialized)
framework.auth    // AuthUnit
framework.pubsub  // PubSubUnit
framework.rpc     // RpcUnit
framework.sync    // SyncUnit

// Generic accessor for any unit by name
framework.getUnit<CacheUnit>("cache")
```

### Accessing Modules

```ts
// Get a registered module by name (throws if not found or not initialized)
const hrModule = framework.getModule<HrModule>("hr")

// Get all registered modules
const modules = framework.getModules()
```

### Auth Unit Shape

The auth unit exposes `server.handler(request)` for HTTP, `server.workflows.{user,session,role}` for programmatic access, and `client` for frontend auth. The `AuthConfig` requires `access_control`, `roles`, `baseURL`, `secret`.

### Package Exports

`@aspen-os/framework` subpath exports (declared in `exports` in `package.json`):
```ts
import { Framework } from "@aspen-os/framework"        // types only
import { createAuthUnit } from "@aspen-os/framework/auth"
import { createRpcUnit } from "@aspen-os/framework/rpc"
```

Currently exported subpaths: `auth`, `drizzle`, `logs`, `notification`, `rpc`, `storage`, `sync`. Not exported despite having source: `pubsub` (has directory). The `pubsub` unit is internal to the framework.

## Conventions

- All DB IDs are `text` with `gen_random_uuid()::text` default (not native UUID type)
- All timestamps use `withTimezone: true`
- Unit factory functions are named `create<Name>Unit`
- `Result<T, E>` type: `{ success: true, data } | { success: false, error }`
- Do not create barrel files unless explicitly told to
- Framework tsconfig has path alias `@/*` → `./src/*`

## Current State

- Most domain packages (`hr`, `analytics`, `banking`, `reports`) are empty stubs
- No CI/CD, Docker for the app itself, or deployment config
- No test files or test infrastructure
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source
- `src/db/drizzle.config.ts` is empty — no Drizzle Kit config is active yet
