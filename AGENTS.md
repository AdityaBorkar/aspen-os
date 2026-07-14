# @aspen-os

Bun monorepo. A business framework (`@aspen-os/framework`) with pluggable units/modules, plus a TanStack Start example app and a docs site.

## Runtime & Toolchain

- **Runtime**: Bun (not Node.js). **Package manager**: Bun workspaces (`bun install`).
- **Language**: TypeScript, ESM only (`"type": "module"`). `noEmit: true`, `verbatimModuleSyntax: true`, bundler resolution, `strict` + `noUncheckedIndexedAccess` + `noUncheckedSideEffectImports`.
- **Linter/formatter**: Biome (`biome.json` at root) — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports. Tailwind `useSortedClasses` is `error` (auto-fixed via `clsx`/`cva`/`tw`).
- **`bunfig.toml`**: install scripts disabled (`ignore-scripts=true`), 3-day minimum release age (`minimumReleaseAge=259200`, excludes `@types/bun`/`typescript`/`@biomejs/biome`), lockfile not saved as text.
- **Workspace catalog**: shared dep versions pinned in root `package.json` `workspaces.catalog` (`@types/bun`, `bun`, `drizzle-orm`, `typescript`, `valibot`); referenced as `catalog:` in packages.
- TypeScript is `^7.0.1-rc` in the catalog (some packages like recruiter/docs-www override to `^7.0.2` in their own devDeps).

## Commands

```
bun install                                    # install all workspace deps
bun run check:lint                             # biome check --fix . (root)
bun run check:types                            # tsc -b (root tsconfig)
bun run update:deps                            # taze -rw --maturity-period 3
cd packages/framework && bun run check:types   # typecheck framework (own tsconfig)
cd packages/framework && bun run check:lint    # biome check --fix . (framework)
```

No build/test/format scripts at root or in framework. Each domain package has `check:lint` and `check:types` scripts.

**recruiter** scripts use `app:` prefix:
```
cd examples/recruiter && bun run app:dev       # vite dev --port 3000
cd examples/recruiter && bun run app:build     # vite build
cd examples/recruiter && bun run app:prepare   # bun scripts/prepare.ts (calls f.prepare())
cd examples/recruiter && bun run app:preview   # vite preview
cd examples/recruiter && bun run db:studio     # aspen db-studio --config=src/aspen/server.ts
cd examples/recruiter && bun run generate-routes  # tsr generate (TanStack Router)
cd examples/recruiter && bun run check:lint    # biome check --fix .
cd examples/recruiter && bun run check:types    # tsc -b
```

**docs-www** (`bun run dev` → port 3005; `bun run types:check` → `fumadocs-mdx && tsc --noEmit`). Has no `deploy` script — deploy manually via `vite build && wrangler deploy` (uses `wrangler.jsonc`, `nodejs_compat` flag). **Gotcha**: `ignore-scripts=true` in `bunfig.toml` prevents the `postinstall` (`fumadocs-mdx`) from running — run `bunx fumadocs-mdx` manually before `bun run build` if `.source/` is missing.

**Path-alias gotcha**: Each package's tsconfig maps `@/*` to its own `./src/*`. Root tsconfig has no `paths` field. Run typecheck in the package whose alias you mean.

## Git Hooks (Husky)

Hooks **are** active via `.husky/`:
- **pre-commit**: `bunx lint-staged` → runs `biome format --fix --no-errors-on-unmatched` on staged files.
- **commit-msg**: `bunx commitlint --edit $1` → enforces conventional commits (`.commitlintrc.json`).

Allowed commit types: `build chore ci docs feat fix perf refactor revert test wip`.

## Project Structure

```
packages/
  framework/          # Core library — only package with real source, deps, scripts
  organization/       # Domain module (5 workflows, 7 tables)
  compliance/         # Domain module (5 workflows, 3 services)
  tasks/              # Domain module (11 workflows, 2 services)
  drive/              # Domain module (6 workflows, 5 services)
  constants/          # Shared enums and constants (@aspen-os/constants)
  hr/                 # Scaffold — has package.json with deps + src structure, but module class is incomplete (TODOs)
  accounting/ crm/ fleet/ inventory/ reports/ pharmacy/  # Pure stubs (package.json is just { "name": "..." })
examples/
  recruiter/          # TanStack Start + React 19 + Vite 8 + Tailwind 4 app (dev port 3000)
docs-www/             # TanStack Start docs site → Cloudflare Workers (fumadocs)
docs/                 # adr/, BOUNDED_CONTEXTS.md, DOMAIN_MODEL.md, TODO.md, sow/
```

Root also has `CODING_CONVENTIONS.md` and `CONTEXT.md` with full domain language and anti-patterns.

Workspace globs: `./packages/*`, `./examples/*`, `./docs-www`. Root `tsconfig.json` uses composite project references to all packages (including `pharmacy`).

**Documentation sourcing**: The `docs-www` app pulls MDX content from each package's `docs-www/` directory, configured in `docs-www/source.config.ts`. Packages with docs content: framework, organization, compliance, tasks, drive, hr, constants. To add a new package's docs, add a `defineDocs()` entry in `source.config.ts` and create `packages/<name>/docs-www/`.

## App Setup (recruiter)

- **Docker Compose** (`examples/recruiter/docker-compose.yaml`): starts **Postgres** (`postgres:18-alpine`, port 5432, user/pass/db all `recruiter`) and **SeaweedFS** (S3-compatible storage: master on 9333, volume on 8080, filer on 8888, S3 on 8333).
- Reads `.env.local` (gitignored). Key vars: `DB_*`, `AUTH_SECRET`, `STORAGE_*` (endpoint `http://localhost:8333`), `GOOGLE_CLIENT_*`, `PUBLIC_WEB_*`.
- Framework config lives in `examples/recruiter/src/aspen/`: `server.ts` (`Framework.create`), `auth.ts` (access control + roles), `client.ts`.
- Env validated via `@t3-oss/env-core` with Zod (`examples/recruiter/src/env.ts`). Vite env prefix is `PUBLIC_`.
- **`aspen` CLI** (from framework `bin`): `aspen db-studio --config=<path>` dynamically imports the framework config and launches Drizzle Kit Studio (default port 4983).

## Framework Architecture (`packages/framework`)

Three entry surfaces: `./src/server/` (Node/Bun), `./src/client/` (browser), `./src/cli/` (commander-based CLI, exposed as `aspen` bin). There is **no `src/index.ts`** barrel.

### Package exports

`@aspen-os/framework` package.json declares only `./client` and `./server` — no `.` entry. The recruiter app imports types and `createAccessControl` from bare `@aspen-os/framework` (works via Bun workspace resolution), but the actual exports live in:
- `@aspen-os/framework/server` — `Framework` class, `FrameworkConfig`, `Unit`, `Module`, `FrameworkInstance`, all config types, all unit classes.
- `@aspen-os/framework/client` — client `Framework` class, `createAccessControl` (re-exported from `better-auth/plugins/access`), client config types.

### Units vs Modules

- **Unit** (server): `{ readonly $name: string; $destroy(): Promise<void>; $prepare?(): Promise<void> }` — uses `$` prefix for lifecycle methods. Client units use no prefix (`name`, `destroy()`, `prepare?()`).
- **Module**: `{ readonly name: N; initialize?(units: Record<string, Unit>): void; prepare?(): Promise<void>; destroy(): Promise<void> }`.
- Both interfaces are defined inline in `src/server/index.ts` and `src/client/index.ts` — there is no separate `src/types.ts`.

### Framework usage

```ts
import { Framework } from "@aspen-os/framework/server"

const framework = Framework.create(config, { organization: orgModule })
await framework.prepare()                 // runs unit.$prepare() then module.prepare()
await framework.run(async () => { /* AsyncLocalStorage: { db, pubsub } */ })
await framework.destroy()
```

API facts that differ from what you might guess:
- `Framework.create(config, modules)` is the **only** constructor — it instantiates all 7 units, calls `module.initialize(units)` on each module, and returns a proxy-wrapped `FrameworkInstance`. There is no `new Framework(config)` or `registerModule()`.
- **Seven** units are **required** in `FrameworkConfig`: `db, auth, logs, pubsub, rpc, storage, kvStore`.
- Modules are passed as a **named object** to `create()`. Module names become proxy keys — e.g. `framework.organization` returns the module.
- Use `framework.getUnit("auth")` / `framework.getModule("organization")` for typed access, or proxy access (`framework.db`, `framework.organization`).
- `run(fn)` provides `{ db, pubsub }` via `AsyncLocalStorage`; `db` is the drizzle `NodePgDatabase`, `pubsub` is the `PubSubUnit`.
- `prepare()` runs each unit's `$prepare()` (e.g. `DatabaseUnit.$prepare()` calls `pushSchema()`), then each module's `prepare()`. Errors are caught and logged per-unit/module.

### Core units (created by `Framework` via `new`)

All are classes instantiated in `src/server/index.ts` with constructor-injected deps:

| Unit | Class | Path | Injected deps |
|---|---|---|---|
| db | `DatabaseUnit` | `src/server/db/` | — (owns `pg.Pool` + drizzle `db`) |
| logs | `LogUnit` | `src/server/log/` | `{ db }` |
| pubsub | `PubSubUnit` | `src/server/pubsub/` | `{ db }` |
| storage | `StorageUnit` | `src/server/storage/` | `{ db }` |
| auth | `AuthUnit` | `src/server/auth/` | `{ db }` |
| rpc | `RpcUnit` | `src/server/rpc/` | `{ auth, db, logs, pubsub }` |
| kvStore | `KvStoreUnit` | `src/server/kv-store/` | `{ db }` |

### Auth unit shape (server)

`AuthUnit` (`src/server/auth/index.ts`) exposes:
- `$db_schema` — the auth Drizzle schema record (note the `$` prefix, consistent with server unit convention).
- `auth` — the raw `betterAuth` `Auth` instance.
- `fetch_handler(request)` — HTTP handler (not `handler`).
- `user` getter — `{ create, delete, get({id}|{email}), update, role: { assign, unassign } }`.
- `session` getter — `{ create (email+password → {user,session}), validate(token), invalidate(id) }`.
- `role` getter — `{ list, delete(name) }`.

The client `AuthUnit` (`src/client/auth/index.ts`) exposes `client` — the better-auth React client. It has `name` (not `$name`).

`AuthConfig` (`src/server/auth/types.ts`) requires: `access_control`, `roles`, `baseURL`, `secret`, `session{expiresIn?}`; optional `cfSecretKey`, `socialProviders.google`. `access_control` and `roles` are destructured out of config to avoid being spread into `betterAuth()` top-level, but **are** passed to betterAuth via the `admin()` plugin (`admin({ ac: access_control, roles })`).

## Domain Module Pattern

Modules follow a strict pattern (see `organization`, `compliance`, `tasks`, `drive` for reference):
- Static `create(config)` factory. Private workflow fields with `#` prefix, initialized lazily in `initialize(units)`.
- Getter properties that throw `notInitialized()` if accessed before `initialize()`.
- `db_schema` export (drizzle schema namespace). `name` as kebab-case readonly string.
- `prepare()` is optional — registers pubsub handlers/schedules (e.g. drive registers a trash purge cron). Schema pushing is handled by `DatabaseUnit.$prepare()`, not by modules. `destroy()` nulls out fields and unregisters.
- File structure: `src/{index,db-schema,types,event-map,constants}.ts`, `src/schemas/`, `src/workflows/`, optionally `src/services/`.
- Package: `@aspen-os/<module>`, `"type": "module"`, `exports: { ".": "./src/index.ts" }`, deps on framework + constants via `workspace:*`.
- **Module `initialize()` signatures vary** — each module types its own subset of units: organization/tasks take `{ db, pubsub }`, compliance takes `{ db, kvStore, pubsub }`, drive takes `{ db, storage, pubsub }`.

## Conventions

- DB IDs are `text` with `DEFAULT gen_random_uuid()::text` (not native UUID). Exception: better-auth tables (`user`, `session`, `account`, `verification`) use `text("id").primaryKey()` without a default.
- Timestamps use `TIMESTAMPTZ` / `withTimezone: true`. `createdAt`: `.notNull().defaultNow()`. `updatedAt`: `.notNull().defaultNow().$onUpdate(() => new Date())` (auth) or manually set in workflows.
- Table names: `snake_case`. Column names: `snake_case` in Postgres, `camelCase` in TS (drizzle maps). Columns sorted alphabetically by TS property name.
- **Validation**: Valibot for domain module input (create/update/filter schemas). Zod for RPC procedures (oRPC) and env vars (t3-env).
- **No barrel files** unless explicitly told (`CODING_CONVENTIONS.md`).
- **No build step**: package `exports` point at raw `.ts` files.
- `*.gen.ts` is gitignored (codegen output).
- Constants as `as const` objects with `UPPER_SNAKE` keys and lowercase string values. Shared in `@aspen-os/constants`, module-specific in `constants.ts`.
- Events: `"domain:event_name"` format, typed via `EventMap` type. Published via PubSub as plain string topics — the event map is a type-level contract, not a runtime bus.
- There is no `Result<T,E>` or `PaginatedResult` type — don't use or create them.
- See `CODING_CONVENTIONS.md`, `CONTEXT.md`, and `docs/DOMAIN_MODEL.md` for full domain language and anti-patterns.

## Current State

- `organization`, `compliance`, `tasks`, and `drive` are fully implemented domain modules. `hr` is a scaffold (has src structure but incomplete module class). All other domain packages (`accounting`, `crm`, `fleet`, `inventory`, `reports`, `pharmacy`) are pure stubs.
- No CI/CD, no Docker for the framework, no deployment config beyond `docs-www`'s `wrangler.jsonc`.
- No tests for the framework or domain modules. `recruiter` has `vitest` + `@testing-library` in devDeps but no `test` script — testing not yet wired up.
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source.
