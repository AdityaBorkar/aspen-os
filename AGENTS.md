# @openbiz-framework

Bun monorepo. Business framework with pluggable domain modules and presets.

## Runtime & Toolchain

- **Runtime**: Bun (not Node.js)
- **Package manager**: Bun workspaces (`bun install`)
- **Language**: TypeScript, ESM only (`"type": "module"`)
- **tsconfig**: `noEmit: true`, `verbatimModuleSyntax: true`, bundler module resolution
- **Linter/formatter**: Biome (`biome.json` at root) — double quotes, 2-space indent, LF, organized imports
- Root `package.json` has TypeScript `^7.0.1-rc`; framework package pins `^5.7.2`
- `bunfig.toml` disables install scripts (`ignore-scripts=true`) and telemetry

## Commands

```
bun install                                    # install all workspace deps
cd packages/framework && bun run typecheck     # typecheck framework (tsc --noEmit)
cd packages/framework && bun run dev           # typecheck in watch mode
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

Only `packages/framework` has deps, scripts, and source code. The `presets/*` workspace glob in root `package.json` has no matching directories yet.

## Framework Architecture (`packages/framework`)

### Entrypoints

- `src/framework.ts` — `Framework` class. Orchestrates module lifecycle: `new Framework(config)` → `framework.initialize()` → `framework.run(fn)` → `framework.destroy()`.
- `src/modules/` — each subdirectory is a module. No barrel `index.ts` exists at this level.
- `src/lib/` — shared infra: `db.ts`, `redis.ts`, `context.ts`, `pubsub.ts`, `types.ts`.

### Framework Usage Pattern

```ts
import { Framework } from "@aspen-os/framework"

const framework = new Framework({
  db: { host, port, user, password, database },
  auth: { secret, roles: [...] },
})
await framework.initialize()
await framework.run(async () => {
  // code runs inside AsyncLocalStorage context with db + pubsub
})
await framework.destroy()
```

`framework.run()` provides `{ db, pubsub }` via `AsyncLocalStorage` — all module calls inside it share the same DB connection and pubsub instance.

### Module Pattern

Every module follows: `createXModule(config) → XModule`. The module interface exposes `initialize()`, `destroy()`, and `healthCheck()`. Modules with DB state also export a `db_schema` (Drizzle tables) and a `*Schema` namespace re-export.

Directory layout for complex modules:
```
modules/<name>/
  index.ts       # factory function + public re-exports
  types.ts       # interfaces
  schema.ts      # Drizzle ORM table definitions (pgTable)
  service.ts     # internal DB operations
```

### Current Modules

- **auth**: Users, roles, permissions, sessions. Drizzle schemas in `auth/db-schema/`. Workflows in `auth/workflows/` (user.ts, role.ts, session.ts). Uses `better-auth` under the hood.
- **pubsub**: Database-backed pub/sub (uses `pg-boss`). Creates its own tables via raw SQL.
- **rpc**: RPC module using `@orpc/server`.
- **sync**: Sync module (config-driven).
- **cache**: Redis-backed with TTL, prefix support, `getOrSet` pattern.
- **storage**: S3 storage via `@aws-sdk/client-s3`. Has schema.ts + service.ts.
- **notification**: Multi-provider notifications. Has schema.ts + service.ts.
- **logs**: Structured logging with buffer. Has buffer.ts, logger.ts, schema.ts, service.ts.

### Lib Layer (`src/lib/`)

- `db.ts`: Singleton pg.Pool + Drizzle instance. `getPool()`, `getDrizzle()`, `query()`, `closePool()`.
- `redis.ts`: Singleton ioredis instance. `getRedis()`, `closeRedis()`.
- `context.ts`: `AsyncLocalStorage` providing `{ db, pubsub }` per request.
- `types.ts`: Shared interfaces (`Module`, `ModuleConfig`, `DatabaseConfig`, `RedisConfig`, `Result`, `PaginatedResult`).

### Path Alias

Framework tsconfig has `@/* → ./src/*`. Use this for internal imports within the framework package.

### Package Exports

`@aspen-os/framework` exposes subpath exports for each module:
```ts
import { Framework } from "@aspen-os/framework"        // src/modules/index.ts (does not exist yet)
import { createAuthModule } from "@aspen-os/framework/auth"
import { createRpcModule } from "@aspen-os/framework/rpc"
```

Only `.`, `./auth`, and `./rpc` are currently declared in `exports`.

## Dev Infrastructure

Docker Compose (`packages/framework/docker-compose.yaml`) provides:
- **PostgreSQL** (custom Dockerfile with TimescaleDB + pgvector + extensions)
- **Redis 7** (alpine)
- Default creds: `aspen-os`/`aspen-os` on both, DB name `aspen-os`

Start with: `cd packages/framework && docker compose up -d`

## Conventions

- All DB IDs are `text` with `gen_random_uuid()::text` default (not native UUID type)
- All timestamps use `withTimezone: true`
- Drizzle schemas exported as namespaces: `export * as authSchema from "./auth/schema"`
- Module factory functions are named `create<Name>Module`
- `Result<T, E>` type for error handling: `{ success: true, data } | { success: false, error }`
- Do not create barrel files unless explicitly told to (per CODING_CONVENTIONS.md)
- Biome has import groups referencing `@plasmo` and `@plasmohq` — these are template leftovers, not real deps
- Biome has a linter override disabling rules for `./src/components/ui/**` — that directory does not exist in this repo

## Current State

- Most domain packages (`hr`, `analytics`, `banking`, `reports`) are empty stubs
- `packages/framework/src/modules/index.ts` barrel file does not exist yet (package.json `.` export points to it)
- `packages/framework/src/index.ts` is empty
- No CI/CD, Docker for the app itself, or deployment config
- No test files or test infrastructure
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source
