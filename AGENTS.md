# @aspen-os-framework

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
```

No test, build, lint, or format scripts are defined anywhere yet.

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
- `src/modules/index.ts` — barrel re-export of all modules, types, and schemas. This is the `.` export in package.json.
- `src/lib/index.ts` — re-exports `db`, `redis`, `context`, `pubsub`, `types`.

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

Directory layout for complex modules (auth, workflows, files, locking, notification, analytics, logging):
```
modules/<name>/
  index.ts       # factory function + public re-exports
  types.ts       # interfaces
  schema.ts      # Drizzle ORM table definitions (pgTable)
  service.ts     # internal DB operations
  db-schema/     # (auth only) separate Drizzle schema dir
  workflows/     # (auth only) business logic per entity
```

Simpler modules are single files: `cache.ts`, `config.ts`, `events.ts`, `pubsub.ts`.

### Key Modules

- **auth**: Users, roles, permissions, sessions. Drizzle schemas in `auth/db-schema/`. Workflows in `auth/workflows/` (user.ts, role.ts, session.ts). Uses `better-auth` under the hood.
- **workflows**: Step-based workflow engine with compensation (saga pattern). Uses pg-boss for job queuing. Creates its own tables via raw SQL in `initialize()`.
- **config**: Reads DB/Redis config from env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `REDIS_HOST`, etc.) with defaults. Zod validation.
- **events**: In-memory pub/sub with history. No persistence.
- **cache**: Redis-backed with TTL, prefix support, `getOrSet` pattern.
- **files**: S3 storage via `@aws-sdk/client-s3`.
- **locking**: Distributed locks (Redis-backed).
- **logging**: Structured logging with buffer.
- **notification**: Multi-provider notifications.
- **analytics**: Event tracking and aggregation.
- **audit-log**: Audit logging module.

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
import { createAuthModule } from "@aspen-os/framework/auth"
import { createCacheModule } from "@aspen-os/framework/cache"
import { getDrizzle } from "@aspen-os/framework/lib"
import { Framework } from "@aspen-os/framework"  // from src/modules/index.ts barrel
```

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

## Current State

- Most domain packages (`hr`, `analytics`, `banking`, `reports`) are empty stubs
- No CI/CD, Docker for the app itself, or deployment config
- No test files or test infrastructure
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source
