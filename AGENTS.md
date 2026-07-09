# @aspen-os

Bun monorepo. A business framework (`@aspen-os/framework`) with pluggable units/modules, plus two TanStack Start apps.

## Runtime & Toolchain

- **Runtime**: Bun (not Node.js). **Package manager**: Bun workspaces (`bun install`).
- **Language**: TypeScript, ESM only (`"type": "module"`). `noEmit: true`, `verbatimModuleSyntax: true`, bundler resolution, `strict` + `noUncheckedIndexedAccess`.
- **Linter/formatter**: Biome (`biome.json` at root) — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports. Tailwind `useSortedClasses` is `error` (auto-fixed via `clsx`/`cva`/`tw`).
- **`bunfig.toml`**: install scripts disabled (`ignore-scripts=true`), 3-day minimum release age (`minimumReleaseAge=259200`), lockfile not saved as text.
- TypeScript versions differ by package: root `^7.0.1-rc`, framework `^5.9.3`, apps `^6.0.3`.

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

## Git Hooks (Husky)

Hooks **are** active via `.husky/`:
- **pre-commit**: `bunx lint-staged` → runs `biome check --fix --no-errors-on-unmatched` on staged files.
- **commit-msg**: `bunx commitlint --edit $1` → enforces conventional commits.

Allowed commit types: `build chore ci docs feat fix perf refactor revert test wip`.

## Project Structure

```
packages/
  framework/          # Core library — only package with real source
  organization/       # Fully implemented domain module (6 workflows, 8 tables)
  constants/          # Shared enums and constants (partial — index.ts has code)
  hr/                 # Domain stubs (skeleton HrModule, empty content)
  accounting/ crm/ drive/ fleet/ inventory/ reports/ tasks/  # Pure stubs
examples/
  recruiter/          # TanStack Start + React 19 + Vite 8 + Tailwind 4 app (dev port 3000)
documentation/        # TanStack Start docs site → Cloudflare Workers (wrangler deploy)
docs/                 # CODING_CONVENTIONS.md, TODO.md, ADRs, domain model
```

Workspace globs: `./packages/*`, `./examples/*`, `./documentation`. Only `packages/framework` has real deps, scripts, and source.

### App setup prerequisites

- **recruiter**: needs Postgres. `docker compose up` (in `examples/recruiter`) starts `postgres:18-alpine` on `:5432` (user/pass `postgres`, db `recruiter`). Reads `.env.local`. Vite env prefix is `PUBLIC_`.
- **recruiter & documentation**: TanStack Router file-based routes — run `bun run generate-routes` (`tsr generate`, reads `tsr.config.json`) when adding routes.
- **documentation**: deploy via `bun run deploy` (= `vite build && wrangler deploy`, uses `wrangler.jsonc`, `nodejs_compat` flag).

## Framework Architecture (`packages/framework`)

Framework has three entry surfaces: `./src/server/` (Node/Bun), `./src/client/` (browser), `./src/cli/` (commander-based CLI, exposed as `aspen` bin).

### Units vs Modules

- **Unit**: internal building block. `Unit` interface (`src/types.ts`): `{ name, destroy() }`. Units may optionally implement `prepare()`. Wired through constructors.
- **Module**: optional business functionality, passed to `Framework.create()`. `Module` interface: `{ name, destroy(), initialize?(units), prepare?() }`.

### Entrypoints

- `src/server/index.ts` — `Framework` class (server). Lifecycle: `Framework.create(config, modules)` → `await prepare()` → `await run(fn)` → `await destroy()`.
- `src/client/index.ts` — client-side `Framework` class with `AuthUnit`, `LogUnit`, `RpcUnit`.
- `src/index.ts` — barrel re-exporting types + `Framework` + `createAccessControl`.
- `src/types.ts` — `Unit` and `Module` interfaces only. No `Result<T,E>` or `PaginatedResult` (those don't exist in code).

### Framework usage

```ts
import { Framework } from "@aspen-os/framework"

const framework = Framework.create(config, { hr: hrModule, org: orgModule })
await framework.prepare()                 // runs unit.prepare() — e.g. schema migrations via pushSchema
await framework.run(async () => { /* AsyncLocalStorage: { db, pubsub } */ })
await framework.destroy()
```

API facts that differ from what you might guess:
- `Framework.create(config, modules)` is the **only** constructor — it instantiates all 7 units, calls `module.initialize(units)` on each module, and returns a proxy-wrapped `FrameworkInstance`. There is no `new Framework(config)` or `registerModule()`.
- **Seven** units are **required** in `FrameworkConfig`: `db, auth, logs, pubsub, rpc, storage, kvStore`.
- Modules are passed as a **named object** to `create()`, not registered one-by-one. Module names become proxy keys — e.g. `framework.hr` returns the module.
- There are **no typed getters** like `framework.auth`. Use `framework.getUnit("auth")` / `framework.getModule("hr")`. Module names become proxy keys — e.g. `framework.organization` returns the module directly.
- `run(fn)` provides `{ db, pubsub }` via `AsyncLocalStorage`; `db` is the drizzle `NodePgDatabase`, `pubsub` is the `PubSubUnit`.
- `prepare()` runs each unit's `prepare()` (e.g. `DatabaseUnit.prepare()` calls `pushSchema()`), then each module's `prepare()`.

### Core units (created by `Framework` via `new`)

All are **classes** instantiated in `src/server/index.ts` with constructor-injected deps:

| Unit | Class | Path | Injected deps |
|---|---|---|---|
| db | `DatabaseUnit` | `src/server/db/` | — (owns `pg.Pool` + drizzle `db`) |
| logs | `LogUnit` | `src/server/log/` | `{ db }` |
| pubsub | `PubSubUnit` | `src/server/pubsub/` | `{ db }` |
| storage | `StorageUnit` | `src/server/storage/` | `{ db }` |
| auth | `AuthUnit` | `src/server/auth/` | `{ db, logs, pubsub }` |
| rpc | `RpcUnit` | `src/server/rpc/` | `{ auth, db, logs, pubsub }` |
| kvStore | `KvStoreUnit` | `src/server/kv-store/` | `{ db }` |

### Auth unit shape

`AuthUnit` exposes:
- `client` — better-auth React client (frontend).
- `db_schema` — the auth Drizzle schema record.
- `server.$` — the raw `betterAuth` `Auth` instance.
- `server.handler(request)` — HTTP handler.
- `server.workflows.{user,session,role}` — programmatic API:
  - `user`: `create`, `delete`, `get({id}|{email})`, `update`, `role.{assign,unassign}`.
  - `session`: `create` (email+password → `{user,session}`), `validate(token)`, `invalidate(id)`.
  - `role`: `list`, `delete(name)`.

`AuthConfig` (`src/server/auth/types.ts`) requires: `access_control`, `roles`, `baseURL`, `secret`, `session{expiresIn?}`; optional `socialProviders.google`. Note: `access_control` and `roles` are accepted but intentionally not passed to `betterAuth()` on the server — they are used only by the client AuthUnit.

### Package exports

`@aspen-os/framework` subpaths: `.` (types + `Framework` + `createAccessControl`), `./client`, `./server`. That's it — no per-unit subpath exports.

## Conventions

- DB IDs are `text` with `DEFAULT gen_random_uuid()::text` (not native UUID). Timestamps use `TIMESTAMPTZ` / `withTimezone: true`.
- **Do not create barrel files** unless explicitly told (`docs/CODING_CONVENTIONS.md`).
- Framework path alias `@/*` → `./src/*` (framework-local tsconfig).
- `*.gen.ts` is gitignored (codegen output).
- See `docs/CODING_CONVENTIONS.md` and `CONTEXT.md` for domain language and anti-patterns.

## Current State

- Domain packages (`hr`, `accounting`, `crm`, etc.) are stubs referenced by root tsconfig but with minimal/no source.
- `organization` is fully implemented with 6 workflows, 8 tables, and typed domain events.
- No CI/CD, no Docker for the framework, no deployment config beyond `documentation`.
- No tests for the framework.
- `codedb.snapshot` at root is a CodeDB indexing artifact, not source.
