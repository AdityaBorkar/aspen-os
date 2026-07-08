# @aspen-os

Bun monorepo. A business framework (`@aspen-os/framework`) with pluggable units/modules, plus two TanStack Start apps.

## Runtime & Toolchain

- **Runtime**: Bun (not Node.js). **Package manager**: Bun workspaces (`bun install`).
- **Language**: TypeScript, ESM only (`"type": "module"`). `noEmit: true`, `verbatimModuleSyntax: true`, bundler resolution, `strict` + `noUncheckedIndexedAccess`.
- **Linter/formatter**: Biome (`biome.json` at root) — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports. Tailwind `useSortedClasses` is `error` (auto-fixed via `clsx`/`cva`/`tw`).
- **`bunfig.toml`**: install scripts disabled (`ignore-scripts=true`), 3-day minimum release age (`minimumReleaseAge=259200`), lockfile not saved as text.
- TypeScript versions differ by package: root `^7.0.1-rc`, framework `^5.7.2`, apps `^6.0.2`.

## Commands

```
bun install                                    # install all workspace deps
bun run check:lint                             # biome check --fix . (root)
bun run check:types                            # tsc -b (root tsconfig)
cd packages/framework && bun run check:types   # typecheck framework (own tsconfig)
cd packages/framework && bun run check:lint    # biome check --fix . (framework)
```

No build/test/format scripts at root or in framework. Testing exists only in `documentation` (`bun run test` = `vitest run`). `examples/recruiter` has vitest deps but no `test` script.

**Path-alias gotcha**: `@/*` resolves differently per tsconfig — root maps to `./examples/recruiter/src/*`, framework maps to `./packages/framework/src/*`. recruiter also declares `@/*` via the Node `imports` field. Run typecheck in the package whose alias you mean.

## Commit Conventions

`commitlint.config.ts` extends conventional-commits; allowed types: `build chore ci docs feat fix perf refactor revert test wip`. The `@commitlint` package is **not** installed and no git hooks are active — convention only, not enforced.

## Project Structure

```
packages/
  framework/                            # Core library — only package with real source
  hr/ analytics/ banking/ reports/      # name-only stubs, no source
examples/
  recruiter/        # TanStack Start + React 19 + Vite 8 + Tailwind 4 app (dev port 3000)
documentation/      # TanStack Start docs site → Cloudflare Workers (wrangler deploy)
docs/               # CODING_CONVENTIONS.md, TODO.md (design notes)
```

Workspace globs: `./packages/*`, `./examples/*`, `./documentation`. Only `packages/framework` has real deps, scripts, and source.

### App setup prerequisites

- **recruiter**: needs Postgres. `docker compose up` (in `examples/recruiter`) starts `postgres:18-alpine` on `:5432` (user/pass `postgres`, db `recruiter`). Reads `.env.local`. Vite env prefix is `PUBLIC_`.
- **recruiter & documentation**: TanStack Router file-based routes — run `bun run generate-routes` (`tsr generate`, reads `tsr.config.json`) when adding routes.
- **documentation**: deploy via `bun run deploy` (= `vite build && wrangler deploy`, uses `wrangler.jsonc`, `nodejs_compat` flag).

## Framework Architecture (`packages/framework`)

### Units vs Modules

- **Unit**: internal building block providing foundational infra. `Unit` interface (`src/types.ts`): `{ name, destroy(), healthCheck() }` — **no `initialize()` method**; units are wired through their constructors.
- **Module**: optional business functionality in a separate package, registered before `initialize()`. `Module` interface matches `Unit`. `ModuleDeps extends UnitDeps` (`{ db, pool, pubsub }`) adding `auth: AuthUnit` and `rpc: RpcUnit`.

### Entrypoints

- `src/framework.ts` — `Framework` class. Lifecycle: `new Framework(config)` → `registerModule(mod)` → `await initialize()` → `await run(fn)` → `await destroy()`.
- `src/index.ts` — barrel re-exporting **types only** (plus `Framework` and `createAccessControl`). Use subpath imports for unit classes/factories.
- `src/context.ts` — `AsyncLocalStorage<{ db, pubsub }>`; `getContext()` throws if not inside `run()`.
- `src/types.ts` — shared interfaces: `Unit`, `UnitDeps`, `ModuleDeps`, `DatabaseConfig`, `Result<T,E>`, `PaginatedResult`.

### Framework usage

```ts
import { Framework } from "@aspen-os/framework"

const framework = new Framework({ db, auth, logs, pubsub, rpc, storage })
framework.registerModule(hrModule)        // singular, one Module, before initialize()
await framework.initialize()
await framework.run(async () => { /* AsyncLocalStorage: { db, pubsub } */ })
await framework.destroy()
```

API facts that differ from what you might guess:
- `registerModule(module)` is **singular** and takes one `Module`, not an array. Calling after `initialize()` throws.
- All six units are **required** in `FrameworkConfig`: `db, auth, logs, pubsub, rpc, storage` (no `sync`/`notification` in config).
- There are **no typed getters** like `framework.auth`. Use `framework.getUnit("auth")` / `framework.getModule("hr")`; with no arg they return the whole map.
- `run(fn)` provides `{ db, pubsub }` via `AsyncLocalStorage`; `db` is the drizzle `NodePgDatabase`, `pubsub` is the `PubSubUnit`.
- `initialize()` does **not** run DB migrations and does **not** call `module.initialize()` (that loop is commented out in `framework.ts`). Modules are stored but not yet initialized by the framework — WIP.

### Core units (created by `Framework` via `new`)

All are **classes** instantiated in `framework.ts` with constructor-injected deps (not `createXUnit` factories):

| Unit | Class | Injected deps |
|---|---|---|
| db | `DatabaseUnit` (`src/db/index.ts`) | — (owns `pg.Pool` + drizzle `db`) |
| logs | `LoggingUnit` | `{ db }` |
| pubsub | `PubSubUnit` | `{ db }` |
| storage | `StorageUnit` | `{ db }` |
| auth | `AuthUnit` | `{ db, logs, pubsub }` |
| rpc | `RpcUnit` | `{ auth, db, logs, pubsub }` |

`src/db/index.ts` exports the `DatabaseUnit` class (with `.pool` and `.db`), **not** `getPool()`/`createDrizzle()` helpers.

### Extra units (NOT created by Framework)

These live under `~`-prefixed dirs and are re-exported as **types only** from the barrel:

- **notification** — `src/~notification/`, subpath `@aspen-os/framework/notification`. `createNotificationUnit(config, pool)` factory; multi-provider.
- **sync** — `src/~sync/`, subpath `@aspen-os/framework/sync`. `createSyncUnit(config)` — pure stub returning a no-op object.
- **kv-store** — `src/~kv-store/`, **no subpath export** (internal). `PostgresKvStore` class / `createKvStore` / `createKvStoreUnit` / `createCacheUnit` (alias).

**`~` prefix is literal**: directories are named `~notification`, `~sync`, `~kv-store`, and imports look like `@/~kv-store/db-schema`. Don't drop the tilde.

**WIP warning**: `~notification` and `~kv-store` import `createDrizzle` from `../db`, but `db/index.ts` no longer exports that symbol — these units will not currently typecheck/run as-is.

### Unit directory layout (varies — no fixed template)

Common files: `index.ts` (class/factory + re-exports), `types.ts`. Drizzle table defs are in `db-schema.ts` for auth/storage/logs/kv-store (notification uses `schema.ts`). Service files are unit-specific (e.g. `file-metadata-service.ts`, `s3-adapter.ts`, `query-service.ts`, `log-buffer.ts`). Auth also has `event-map.ts` and `workflows/` (`user.ts`, `role.ts`, `session.ts`).

### Auth unit shape

`AuthUnit` exposes:
- `client` — better-auth React client (frontend).
- `db_schema` — the auth Drizzle schema record.
- `server.$` — the raw `betterAuth` `Auth` instance.
- `server.handler(request)` — HTTP handler.
- `server.workflows.{user,session,role}` — programmatic API:
  - `user`: `create`, `delete`, `get({id}|{email})`, `update`, `permission.{check,list}`, `role.{assign,list,unassign}`.
  - `session`: `create` (email+password → `{user,session}`), `validate(token)`, `invalidate(id)`.
  - `role`: `list`, `delete(name)`.

`AuthConfig` (`src/auth/types.ts`) requires: `access_control`, `roles`, `baseURL`, `secret`, `session{expiresIn?}`; optional `socialProviders.google`.

### Schema collection

`src/db/get-schemas.ts` — `getSchemas(framework)` merges core unit schemas (auth, logs, notification, storage, kv-store) with each initialized unit's `db_schema`. Intended to feed future drizzle migrations (see `docs/TODO.md`) — migrations are not yet wired.

### Package exports

`@aspen-os/framework` subpaths (from `exports` in `package.json`): `.` (types + `Framework` + `createAccessControl`), `auth`, `drizzle`, `logs`, `notification`, `rpc`, `storage`, `sync`. The `drizzle` subpath maps to `src/db/drizzle/` (an empty dir — nothing active). `pubsub` has source but **no** subpath export (internal). `kv-store` has source but no subpath export.

## Conventions

- DB IDs are `text` with `DEFAULT gen_random_uuid()::text` (not native UUID). Timestamps use `TIMESTAMPTZ` / `withTimezone: true`.
- `Result<T, E = Error>` = `{ success: true, data } | { success: false, error }`.
- **Do not create barrel files** unless explicitly told (`docs/CODING_CONVENTIONS.md`).
- Framework path alias `@/*` → `./src/*` (framework-local tsconfig).
- `*.gen.ts` is gitignored (codegen output).

## Current State

- Domain packages `hr`, `analytics`, `banking`, `reports` are empty stubs.
- No CI/CD, no Docker for the framework, no deployment config beyond `documentation`.
- No tests for the framework; module initialization in `initialize()` is stubbed out.
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source.
