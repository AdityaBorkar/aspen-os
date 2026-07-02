# @openbiz-framework

Bun monorepo. Business framework with pluggable domain modules and presets.

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

Commitlint enforces conventional commits. Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `test`, `wip`.

## Project Structure

```
packages/
  framework/    # Core library — the only package with real code
  hr/           # Stub (name-only package.json, no source)
  analytics/    # Empty
  banking/      # Empty
  reports/      # Empty
```

Only `packages/framework` has deps, scripts, and source code.

## Framework Architecture (`packages/framework`)

### Entrypoints

- `src/framework.ts` — `Framework` class. Orchestrates module lifecycle: `new Framework(config)` → `framework.initialize()` → `framework.run(fn)` → `framework.destroy()`.
- `src/index.ts` — barrel re-exporting all modules and the Framework class.
- `src/db/index.ts` — `getPool()` and `createDrizzle()` (also duplicated in `src/lib/db.ts`).
- `src/context.ts` — `AsyncLocalStorage` providing `{ db, pubsub }` per request.
- `src/types.ts` — shared interfaces: `Module`, `ModuleDeps`, `DatabaseConfig`, `Result`, `PaginatedResult`.

### Framework Usage Pattern

```ts
import { Framework } from "@aspen-os/framework"

const framework = new Framework({
  db: { host, port, user, password, database },
  auth: { /* better-auth config + roles + access_control */ },
})
await framework.initialize()
await framework.run(async () => {
  // code runs inside AsyncLocalStorage context with db + pubsub
})
await framework.destroy()
```

`framework.run()` provides `{ db, pubsub }` via `AsyncLocalStorage` — all module calls inside it share the same DB connection and pubsub instance. `framework.register(modules)` adds extra modules before `initialize()`.

### Module Pattern

Every module follows: `createXModule(config) → XModule`. The `Module` interface (in `src/types.ts`) requires `name`, `initialize(deps)`, `destroy()`, `healthCheck()`. `ModuleDeps` provides `{ db, pool, pubsub }`. Modules with DB state create their own tables via raw SQL in `initialize()`.

Directory layout for modules:
```
src/<name>/
  index.ts       # factory function + public re-exports
  types.ts       # interfaces
  schema.ts      # Drizzle ORM table definitions (pgTable)
  service.ts     # internal DB operations
```

### Current Modules

- **auth**: Users, roles, permissions, sessions. Factory: `createAuthModule`. Drizzle schemas in `auth/db-schema/`. Workflows in `auth/workflows/` (user.ts, role.ts, session.ts). Uses `better-auth` under the hood.
- **pubsub**: Database-backed pub/sub via `pg-boss`. Factory: `createPubSubModule`. Creates its own tables.
- **rpc**: RPC module using `@orpc/server`. Factory: `createRpcModule`.
- **sync**: Stub (not yet implemented). Factory: `createSyncModule`.
- **cache**: Postgres-backed KV store with TTL, prefix, `getOrSet`. Factory: `createCacheModule`. Uses internal `kv-store/` module.
- **storage**: S3 storage via `@aws-sdk/client-s3`. Factory: `createFilesModule` (not `createStorageModule`). Has schema.ts + service.ts.
- **notification**: Multi-provider notifications. Factory: `createNotificationModule`. Has schema.ts + service.ts.
- **logs**: Structured logging with buffer + TimescaleDB hypertable. Factory: `createLoggingModule`. Has buffer.ts, schema.ts, service.ts.
- **kv-store**: Internal Postgres KV store (`PostgresKvStore`). Not exported from `@aspen-os/framework`. Used by cache module.

### Package Exports

`@aspen-os/framework` exposes subpath exports for each module:
```ts
import { Framework } from "@aspen-os/framework"
import { createAuthModule } from "@aspen-os/framework/auth"
import { createCacheModule } from "@aspen-os/framework/cache"
import { createRpcModule } from "@aspen-os/framework/rpc"
// etc.
```

All module subpaths are declared in `exports` (auth, cache, logs, notification, pubsub, rpc, storage, sync).

## Conventions

- All DB IDs are `text` with `gen_random_uuid()::text` default (not native UUID type)
- All timestamps use `withTimezone: true`
- Module factory functions are named `create<Name>Module`
- `Result<T, E>` type: `{ success: true, data } | { success: false, error }`
- Do not create barrel files unless explicitly told to (per CODING_CONVENTIONS.md)
- Biome config has template leftovers: import groups referencing `@plasmo`/`@plasmohq`, linter override for `./src/components/ui/**` — neither exists in this repo

## Current State

- Most domain packages (`hr`, `analytics`, `banking`, `reports`) are empty stubs
- No CI/CD, Docker for the app itself, or deployment config
- No test files or test infrastructure
- No docker-compose file exists despite framework depending on Postgres + Redis
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source
