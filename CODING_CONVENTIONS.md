# Coding Conventions

Conventions extracted from the codebase as it exists today. Every item below is reflected in actual code.

## Repository overview

- **Bun monorepo** (`@aspen-os`) with a business framework (`@aspen-os/platform`) plus pluggable **units** (infrastructure) and **modules** (domain logic), first-class multi-tenancy, and a Fumadocs docs site (`docs`).
- **No host/example app** in the repo yet (the intended first app is called "Recruiter"). There is no `examples/` directory.
- **Workspace state**: `platform`, `organization`, `compliance`, `tasks`, `drive`, `management` fully implemented; `hr` partial (module logic largely written but does not `implement Module` and lacks `$prepareRuntime()`); `accounting`, `crm`, `fleet`, `inventory`, `pharmacy`, `reports` are stubs (`package.json` is just `{ "name": "..." }`).
- The domain model lives in `.working-docs/` (`DOMAIN_MODEL.md`, `BOUNDED_CONTEXTS.md`, `TODO.md`, `adr/`). `docs/` is the built Fumadocs site — **not** the source of truth for domain docs.

## General

- **Runtime**: Bun (not Node.js)
- **Package manager**: Bun workspaces (`bun install`)
- **Language**: TypeScript, ESM only (`"type": "module"`)
- **Linter/formatter**: Biome — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports
- **No barrel files** unless explicitly told. There is no root/`src` barrel for the platform — import via subpaths (`@aspen-os/platform/server`, `@aspen-os/platform/client`).
- **`*.gen.ts`** files are gitignored (codegen output, e.g. the generated auth db-schema)
- Only `platform`, `organization`, and `management` have a **build step** (`bun run build` → `scripts/build.ts` → `.output/`). All other packages export raw `.ts` source.

### TypeScript configuration

Root `tsconfig.json` (extended by all packages):

- `strict: true`, `noUncheckedIndexedAccess: true`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ESNext"`, `lib: ["ESNext"]`
- `composite: true` with project references to every workspace package (plus `docs`)
- `declaration: true`, `declarationMap: true`, `emitDeclarationOnly: true`, `declarationDir: "./.local/types/root"`
- `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noUnusedLocals: true`
- `noUnusedParameters: false`, `noPropertyAccessFromIndexSignature: false`
- `skipLibCheck: true`, `types: ["bun", "@types/bun"]`, `allowJs: true`

**Path-alias gotcha**: each package maps `@/*` to its own `./src/*` (root tsconfig has no `paths`). Run `tsc -b` in the package whose alias you mean.

### Biome configuration

- Import groups (in order): URL imports → blank → Node/Bun/package-with-protocol → blank → bare packages → blank → aliases/paths
- `sortBareImports: true`
- `useSortedClasses: error` for Tailwind class sorting via `clsx`, `cva`, `tw` (with `attributes: ["classList"]`, `functions: ["clsx", "cva", "tw", "tw.*"]`)
- Linter domains enabled: `react: all`, `tailwind: all`, `types: all`; preset `recommended`, plus the nursery `useSortedClasses`
- `src/components/ui/**` has linting disabled (shadcn/ui generated code)
- Git-aware: `vcs.clientKind: "git"`, `useIgnoreFile: true` (respects `.gitignore`)

### bunfig.toml

- `ignore-scripts=true` — install scripts disabled
- `minimumReleaseAge=259200` (3-day minimum release age), excluding `@types/bun`, `typescript`, `@biomejs/biome`
- `saveTextLockfile=false` (binary lockfile `bun.lockb`)
- `telemetry=false`, `logLevel="warn"`, `[run] bun=true`

### Workspace catalog

Shared dependency versions are pinned in the root `package.json` `workspaces.catalog` and referenced as `catalog:` in workspace packages. Current catalog: `@standard-schema/spec`, `@standard-schema/utils`, `@types/bun`, `bun`, `drizzle-orm`, `typescript`, `valibot`.

### Dependencies

- Workspace packages depend on each other via `"workspace:*"` (`@aspen-os/constants`, `@aspen-os/platform`, …).
- Toolchain/ORM/validation deps from the catalog via `catalog:`.
- Infra-level deps are pinned concretely with caret ranges (e.g. `pg ^8.22.0`, `drizzle-kit ^0.31.10`, `pg-boss ^10.4.2`, `better-auth ^1.6.25`, `fflate ^0.8.3`).
- No package declares a `packageManager` field; `bun` itself is only a catalog dependency of `@aspen-os/platform`.

## Database

### IDs

- Always `text` with `DEFAULT uuidv7()` — never native UUID columns.
- Exception: better-auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `apikey`, `twoFactor`, `passkey`) use `text("id").primaryKey()` without a default (better-auth manages ID generation; generated via `bunx auth generate`, i.e. `gen:auth-schema`).

### Timestamps

- Always `timestamp("...", { withTimezone: true })` — never `timestamp without time zone`.
- `createdAt`: `.notNull().defaultNow()`
- `updatedAt`: `.notNull().defaultNow().$onUpdate(() => new Date())`
- `date` columns (e.g., `foundedDate`, `openedDate`) use drizzle's `date()` type, converted from `Date` objects via `.toISOString().split("T")[0]`.

### Table and column naming

- Table names: `snake_case` (e.g., `connection_contact`, `file_metadata`, `kv_store`, `workflow_runs`).
- Column names: `snake_case` in Postgres, `camelCase` in TypeScript (drizzle maps between them).
- Table definitions sort columns alphabetically by their TS property name.

### Enums

- Use `pgEnum("snake_case_name", [...values])`.
- Enum values reference constants objects when available: `pgEnum("compliance_category", [COMPLIANCE_CATEGORY.TAX, ...])`.
- Enum values are lowercase strings.

### Indexes

- Naming: `idx_<table>_<column>` (e.g., `idx_address_country`).
- Indexes defined in the table's third argument as an array of `index()` calls or an object map.

### Other column types

- `jsonb("metadata")` for flexible metadata — often `.default({})`.
- `numeric` for monetary/decimal values (e.g., `annual_revenue`, `contract_value`).
- `integer` for counts/capacity, `bigint("...", { mode: "number" })` for file sizes.
- `text("...").array().default([])` for array fields (e.g., tags).
- `boolean` fields use `.notNull().default(boolean)` pattern.

### Foreign keys

- `text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })`.
- Cascade delete for child records.

### Relations

- Drizzle `relations()` defined in the same schema file as the tables.
- `one()` and `many()` with explicit `fields` / `references` for the owning side.

### Schema management

- **`pushSchema()`** from `drizzle-kit/api` — not migration files (see ADR 0004).
- Platform's `DatabaseUnit.$prepareInfra()` pushes core schemas (auth, audit, logs, kv-store, storage, workflows) via `getSchemas()`.
- Domain modules push their own schemas in their `$prepareInfra()` (merged via `prepareWithModules`).
- Data-loss warnings are logged but the push proceeds.

## Platform

Three server platform classes share an abstract `BasePlatform<M, S>` (`src/server/base-platform.ts`):

| Class | `create()` config | `run()` | Tenant DB |
| --- | --- | --- | --- |
| `SingleTenantPlatform` | `SingleTenantConfig` (`db: DatabaseConfig`) | `run(fn)` | control-plane — no scoping |
| `SharedTenantPlatform` | `SharedTenantConfig` (`db: DatabaseConfig`) | `run(tenantId, fn)` | RLS: transaction + `app.tenant_id` + `SET LOCAL ROLE tenant_role` |
| `IsolatedTenantPlatform` | `IsolatedTenantConfig` (`db: IsolatedTenantDatabaseConfig`) | `run(tenantId, fn)` | DB-per-tenant via `TenantResolver` |

- The three classes are statics with `static create(config, modules)` and no overloaded `run()` — the mode is enforced by the signature.
- `PlatformInstance<M[]>` is a structural type for the CLI; use `SingleTenantPlatformInstance<M>` etc. for typed `run()`.
- `isGlobalTenantId(tenantId)` returns true for `"$global"` — global tenant IDs route to the control-plane DB in shared/isolated modes.
- Single and shared tenants are both flagged "currently EXPERIMENTAL" via `console.warn` at construction.

### Example

```ts
const platform = SingleTenantPlatform.create(config, [
  Organization.create({ country: "INDIA" }),
  Compliance.create(),
]);

await p.$prepareInfra();
await p.run(async () => { /* inside AsyncLocalStorage */ });
await p.$cleanup();
```

### Unit interface (server)

```ts
interface Unit {
  readonly $name: string;
  $cleanup(): Promise<void>;
  $prepareInfra?(...args: unknown[]): Promise<void>;
}
```

- `$prepareInfra` is optional and variadic; units that need inputs (e.g. `DatabaseUnit(controlPlaneSchemas, tenantSchemas)`, `AuthUnit(acl)`) declare their own concrete signatures.
- `$name`, `$cleanup`, `$prepareInfra` — `$` prefix on lifecycle methods.

### Modules

```ts
interface Module<
  N extends string,
  TCP extends Record<string, unknown>,
  TT extends Record<string, unknown>,
> {
  readonly $name: N;
  readonly $dependencies: readonly string[];
  $initialize(units: Record<string, Unit>): void;
  $prepareInfra(): ModuleInfra<TCP, TT>;
  $prepareRuntime(): void | Promise<void>;
  $prepareTenant?(tenantId: string): Promise<void>;
  $cleanup(): void | Promise<void>;
}
```

- All methods are required except `$prepareTenant` (optional; isolated-mode only).
- `$initialize` receives the full unit map; modules that need narrower deps type their own subset (e.g. `{ db, pubsub }`).
- `$prepareInfra()` is synchronous and returns:

```ts
type ModuleInfra<TCP, TT> = {
  auth: { acl: Record<string, readonly string[]> };
  db: { control_plane_schemas: TCP; tenant_schemas: TT };
  events: Record<string, Record<string, string>>;
};
```

- `events` is a **type-level contract only** — it is carried in `ModuleInfra` but has no runtime side effect in the platform.
- Modules declare ACL with `defineAcl({ resource: ["create", "read", "update", "delete", ...] })` (identity fn with `const` generic for literal inference).

### Lifecycle (`createCore` → `$prepareInfra` → `run` → `$cleanup`)

1. `Platform.create(config, modules)` → `BasePlatform.createCore()` instantiates the 8 units in load-bearing DI order, validates `$dependencies`, calls `mod.$initialize(units)`, and returns a **Proxy** whose accessors resolve unit keys first, then module `$name`.
2. `p.$prepareInfra()`:
   - every `unit.$prepareInfra?.()` (each wrapped in try/catch);
   - each `mod.$prepareInfra()`, merging `control_plane_schemas`/`tenant_schemas` and concat ACL actions per resource;
   - `db.prepareWithModules(...)` (pushes schemas); `auth.applyModuleAcl(mergedAcl)` (re-creates the better-auth service with `admin({ ac: createAccessControl(acl) })`);
   - then `mod.$prepareRuntime?.()` inside `runInContext(...)`.
3. `p.run(fn)` — `fn` executes inside `AsyncLocalStorage`; `getContext()` gives `{ audit, auth, db, pubsub, tenantId?, actorId? }`.
4. `p.$cleanup()` — module `$cleanup()` (in context) then unit `$cleanup()`, each wrapped in try/catch.

`IsolatedTenantPlatform` overrides `$prepareInfra()` entirely: db first, then auth, then other units, then `$prepareRuntime`, then `mod.$prepareTenant(tenantId)` for each tenant from `resolver.list()`.

### Eight required units

All units:

| Unit | `$name` | Injected deps | Notes |
| --- | --- | --- | --- |
| `db` (DatabaseUnit) | `"db"` | — (owns `pg.Pool` + drizzle) | tenancy, RLS, `prepareWithModules`; the load-bearing unit |
| `auth` (AuthUnit) | `"auth"` | `{ db, pubsub }` | better-auth service, `fetchHandler`, `_` getter, `applyModuleAcl` |
| `audit` (AuditUnit) | `"audit"` | `{ db }` | `diff`/`write`/`query`/`reconstructState`/`count`; `audit_log` table |
| `logs` (LogUnit) | `"logs"` | `{ db }` | buffered pino-style logger; `child()`, `query`, `getStats` |
| `pubsub` (PubSubUnit) | `"pubsub"` | `{ db }` | single control-plane pg-boss, **lazily started** |
| `storage` (StorageUnit) | `"storage"` | `{ db }` | S3 adapter (SeaweedFS-compatible) + file metadata, tenant-prefixed keys |
| `rpc` (RpcUnit) | `"rpc"` | `{ auth, db, logs, pubsub }` | oRPC `RPCHandler`; built-in `echo` + `health.check` |
| `kvStore` (KvStoreUnit) | `"kvStore"` | `{ db }` | Postgres-backed; `get`/`set`/`del`/`increment`/… |

`PlatformUnits<S>` and accessors are `audit, auth, db, kvStore, logs, pubsub, rpc, storage`.

### Module registration and accessors

- Pass all modules as an array to `Platform.create(config, modules)`. There is no `registerModule()`; modules declare `$dependencies` (e.g. management's `["organization"]`).
- Proxy access: `platform.organization` returns the module directly; `platform.db` returns the unit.
- `platform.getModule("name")` — typed, throws if not found.
- `platform.getUnit("name")` — typed (e.g. `getUnit("kvStore")`, `getUnit("logs")` — note camelCase keys).

### Package exports

`@aspen-os/platform` subpaths: `./server`, `./client`, `./server/db-schemas`. Published `exports`/`bin` point at `.output/` (built); `bin` exposes the `aspen` CLI.

### Client platform

- `src/client/index.ts` — browser `Platform` with only 3 units (`auth`, `logs`, `rpc`), a Proxy, and `run(fn)` which sets `{ auth, logs, rpc }` into the client context.
- Client `Unit<Config>` is `{ readonly $config: Config; readonly $name: string }`; client `Module` is just `{ readonly $name: N }`. Client units use the `$` prefix for the name but have **no** lifecycle methods.

### CLI (aspen)

- Commander CLI at `src/cli/index.ts`, `#!/usr/bin/env bun`.
- Dynamically imports the app config (`platform || p` export) and types it as `PlatformInstance<Module[]>`.
- Commands: `db-studio` (`-c/--config`, `-p/--port`, `-h/--host`, `-t/--tenant`), `tenants` (`-c/--config`, isolated only).

## Domain modules

### Two module-class patterns

**Newer** (organization, tasks, management): workflows are `readonly` properties; `$initialize()` / `$prepareRuntime()` / `$cleanup()` are empty. They still `implements Module` and return a full `ModuleInfra` from `$prepareInfra()`.

```ts
export class Organization implements Module {
  static create(config: OrganizationConfig): Organization {
    return new Organization(config);
  }

  readonly $name = "organization";
  readonly $dependencies = [];
  readonly $config: OrganizationConfig;

  constructor(config: OrganizationConfig) {
    this.$config = config;
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize() {}
  $prepareRuntime() {}
  $cleanup() {}

  readonly addresses = addresses;
  readonly organizations = organizations;
  // ...
}
```

**Older** (compliance, drive; hr leans this way): `#private` stored unit references set in `$initialize(units)`; non-empty `$prepareRuntime()` (pubsub schedules/handlers) and `$cleanup()` (unregister + null out). AGENTS.md documents this pattern; note that in practice current modules keep workflow groups as `readonly` properties rather than throwing getters — only `hr`/`management` use a `notInitialized()`-throwing getter.

Key conventions:

- Class `implements Module`; static `create(config)` factory; `readonly $config`.
- `$name` as kebab-case readonly string; `$dependencies` as `readonly string[]` (typed as `[]` when empty).
- `$prepareInfra()` returns `{ auth: { acl }, db: { control_plane_schemas, tenant_schemas }, events }`.
- Workflow groups exposed as `readonly <entity>= <workflows>` properties (composition over a getter where possible).

### File structure

```
packages/<module>/
  docs/                 # Fumadocs source: index.mdx, overview.mdx, meta.json + domain pages
  src/
    index.ts            # Module class, type re-exports, config types
    types.ts            # Type re-exports from schemas + module-specific interfaces
    pubsub-events.ts    # Event constants + typed event interfaces + EventMap (a.k.a. event-map.ts)
    constants.ts        # Module-specific enums (as const objects) [optional]
    utils/
      acl.ts            # defineAcl({ ... })
    db-schemas/         # directory form (organization, tasks, management):
      index.ts          #   exports control_plane_schemas + tenant_schemas
      <entity>.ts       #   per-entity drizzle pgTable/pgEnum definitions
    db-schema.ts        # single-file form (compliance, drive, hr)
    schemas/
      index.ts          # Re-exports all schemas + types (separate export type / export blocks)
      enums.ts          # Valibot enum schemas mirroring constants
      utils.ts          # Shared valibot schema utilities (regex, lengths)
      <entity>.ts       # Per-entity valibot schemas
    workflows/
      <entity>.ts       # Workflow.name("...").input(...).handler(...) groups
    services/           # Cross-cutting services [optional]
      <service>.ts
  package.json
  tsconfig.json
```

### Package conventions

- Package name: `@aspen-os/<module>`
- `"type": "module"`; dependencies on other workspace packages via `"workspace:*"`, catalog versions via `catalog:`
- `exports`: `"."` → `"./src/index.ts"` (raw TS) **except** `@aspen-os/platform`, `@aspen-os/organization`, `@aspen-os/management` which build to `.output/` via `scripts/build.ts`
- Scripts: `check:lint` (`biome check --fix .`) and `check:types` (`tsc -b`)

### Stub packages

`@aspen-os/accounting|crm|fleet|inventory|pharmacy|reports`: `package.json` is exactly `{ "name": "@aspen-os/<module>" }` (no exports/deps/scripts), `src/index.ts` is empty, and `docs/` holds only `index.mdx` + `meta.json` describing the "not-started" stub.

## Validation

### Valibot (domain modules)

Used for all domain module input validation (create/update/filter schemas).

- Schema naming: `Create<Entity>Schema`, `Update<Entity>Schema`, `<Entity>FiltersSchema`
- Type naming: `Create<Entity>Input`, `Update<Entity>Input`, `<Entity>Filters`
- Types derived via `InferOutput<typeof Schema>`
- Schemas and types co-exported: separate `export type {}` and `export {}` blocks (verbatimModuleSyntax)
- Runtime validation: `parse(Schema, input)` at workflow method entry
- Shared validators in `schemas/utils.ts` (e.g., `NameSchema`, `SlugSchema`, `CountryCodeSchema`, `EmailSchema`)

### Zod

Used in two specific contexts:

- **RPC procedures** (oRPC): `z.object({ ... })` for input validation
- **Environment variables** (t3-env): `z.string()`, `z.coerce.number()`, etc.

### Constants and enums

- Constants as `as const` objects with `UPPER_SNAKE` keys and lowercase string values.
- Types derived via indexed access: `type X = (typeof OBJ)[keyof typeof OBJ]`.
- Shared constants live in `@aspen-os/constants` (single `index.ts` exporting e.g. `ORGANIZATION_STATUS`, `COMPLIANCE_CATEGORY`, `COUNTRY_CODES` + `isValidCountryCode` guard).
- Module-specific constants live in the module's `constants.ts`.
- Valibot `enum_()` schemas in `schemas/enums.ts` mirror the constant objects.
- `pgEnum` values reference the constant objects.
- No `Result<T, E>` / `PaginatedResult` types — don't create them.

## Events

### Event constants

```ts
export const ENTITY_EVENTS = {
  CREATED: "module:entity_created",
  UPDATED: "module:entity_updated",
} as const;
```

- Format: `"domain:event_name"` (lowercase, snake_case event name).
- Constants are `UPPER_SNAKE` keys.

### Typed events

Each event has a corresponding interface:

```ts
export interface EntityCreatedEvent {
  entity: { id: string; name: string };
}
```

### Event maps

```ts
export type EntityEventMap = {
  [ENTITY_EVENTS.CREATED]: EntityCreatedEvent;
  [ENTITY_EVENTS.UPDATED]: EntityUpdatedEvent;
};

export type DomainEventMap = EntityEventMap & OtherEntityEventMap;
```

- The module's `events = { ENTITY_EVENTS }` object is passed through `ModuleInfra.events` as a type-level contract; payload maps (`*DomainEventMap`) are composed by intersection.

## Workflows

- Builder API (platform-level, durable): `Workflow.name("domain.action").input(Schema).handler(fn)` → `WorkflowInstance.run(input, options?)`; `WorkflowStep.name(name).handler(fn)` for reusable steps, run via `ctx.step.run(step, input, options?)`, `ctx.step.run("name", fn, options?)`, or `ctx.step.sleep(ms)`.
- Module workflows are exported as named objects composed per entity (`export const organizations = { create, update, delete: deleteLogo, ... }`); `services/` facade objects may wrap them with `Parameters<typeof x>[0]` typing.
- `ctx.step.run` is **idempotent/durable**: completed step rows (`workflow_steps`) are replayed from cache; steps retry up to `options.retries`.
- Persisted in `workflow_runs` / `workflow_steps` tables (`status`: `running|completed|failed`; steps add `pending|skipped`).
- `WorkflowContext` is `{ actorId?, audit, auth?, config, db, pubsub, runId, step }`; `RunOptions` (`actorId?`, `audit?`, `auth?`, `config?`, `db?`, `pubsub?`) overrides `getContext()` defaults.
- `ctx.pubsub.publish(EVENTS.X, payload)` for emitting events.
- **hr exception**: hr's workflows are plain ES classes (`export class EmployeeWorkflow { constructor(private readonly db) {} async create() {} }`) — the one module not yet migrated to the `Workflow` builder.
- Legacy method-conventions (still true of hr-style workflows): `.returning()` on insert/update to get the result row; optional fields use `?? null` coalescing; business-rule validation before DB ops.

## Auth

- **better-auth** with plugins: `admin`, `username`, `organization`, `phoneNumber`, `emailOTP`, `apiKey`, `twoFactor`, `passkey` (lastLoginMethod/captcha are commented out).
- `createAccessControl` defines the permission matrix (`{ resource: [actions...] }`) via `defineAcl` in `utils/acl.ts`.
- `AuthUnit.applyModuleAcl(acl)` re-creates the better-auth service with `admin({ ac: createAccessControl(acl) })` during `$prepareInfra()`.
- Drizzle adapter: `camelCase: false`, `provider: "pg"`, `usePlural: false`, `transaction: true`.
- Drizzle adapter binds `db.controlPlaneDb` — auth is control-plane only.
- Role is a plain `text("role")` column on `user` — not a separate table.
- Auth DB tables (`auth/db-schema.ts`, 10 tables) do **not** follow the `uuidv7()` ID convention (better-auth manages IDs); the file is generated via `gen:auth-schema`.
- The `_` getter exposes a REST `resource.action` API: `user.{create, get, update, remove, role.assign, role.unassign}`, `session.{create, invalidate, validate}`, `role.{list, remove}`. Use `remove`, not `delete`.

## PubSub

- **pg-boss** for job queue / pub-sub — single control-plane boss, **lazily started** on first use (not in `$prepareInfra()`).
- `publish<T>(topic, data, options?)` / `publishBatch` / `subscribe<T>(topic, handler)` / `unsubscribe` / `schedule(topic, cron, data?)` / `unschedule` / `getSchedules` / `purgeQueue`.
- **Silent-drop pitfall**: if a topic has no queue row (no consumer called `subscribe()` → `boss.work()`), `publish()` returns `null` and the message is dropped. `getUnsubscribedProducedTopics()` tracks produced topics with no subscriber; `BasePlatform.healthCheck` flags the report `"unhealthy"` when any exist.
- Domain modules register schedules and handlers in `$prepareRuntime()` and unregister in `$cleanup()`.
- Health check probes pubsub via `boss.getQueueSize(topic)`, not `send()`.

## RPC

- **oRPC** (`@orpc/server`) for RPC procedures — framework-only; domain modules do **not** define procedures.
- Base procedures in `src/server/rpc/procedures/` (`echo.ts`, `health-check.ts`), composed into a nested router object in `router.ts`: `{ echo: procedure, health: { check: procedure } }`.
- Served by `RpcUnit` via `@orpc/server/fetch` `RPCHandler` (default prefix `/api/rpc`).
- Zod for input validation in RPC procedures.

## Git hooks (Husky)

- **pre-commit**: `bunx lint-staged` → runs `biome format --fix --no-errors-on-unmatched` on staged files
- **commit-msg**: `bunx commitlint --edit $1` → enforces conventional commits
- Allowed commit types: `build chore ci docs feat fix perf refactor revert test wip`

## Naming summary

| Scope | Convention | Example |
| --- | --- | --- |
| Files | `kebab-case` | `db-schema.ts`, `event-map.ts` |
| Classes | `PascalCase` | `OrganizationWorkflow`, `DatabaseUnit` |
| Constants | `UPPER_SNAKE_CASE` | `ORGANIZATION_STATUS`, `COMPLIANCE_EVENTS` |
| DB tables | `snake_case` | `connection_contact`, `file_metadata` |
| DB columns | `snake_case` (mapped to camelCase TS) | `created_at` → `createdAt` |
| Event topics | `domain:event_name` | `organization:updated` |
| Private fields | `#` prefix | `#documents`, `#db` |
| Unit lifecycle (server) | `$` prefix | `$name`, `$prepareInfra`, `$cleanup` |
| Module lifecycle | `$` prefix | `$initialize`, `$prepareInfra`, `$prepareRuntime` |
| Package exports | `@aspen-os/<name>` | `@aspen-os/platform`, `@aspen-os/organization` |
| Module `$name` property | `kebab-case` string | `"organization"`, `"compliance"` |

## Commands

Root (`/`):

```
bun install            # install all workspace deps
bun run check:lint     # biome check --fix .
bun run check:types    # tsc -b (root composite, all project references)
bun run update:deps    # taze -rw --maturity-period 3
bun run clean          # rimraf node_modules/.output/.local/bun.lockb
bun run prepare        # husky
```

Platform / built packages:

```
cd packages/platform && bun run check:types
cd packages/platform && bun run check:lint
cd packages/platform && bun run build          # scripts/build.ts → .output/
```

**Build gotcha**: `platform`, `organization`, and `management` publish `exports`/`bin` pointing at `.output/`. TypeScript resolves types from `.output/`, not source. After changing exports, run `bun run build` **before** typechecking downstream packages (raw-src packages like `tasks`/`compliance` resolve platform/types through `.output/`).

Docs (`bun run dev` → 3005):

```
cd docs && bun run dev            # vite dev --port 3005
cd docs && bun run check:types    # fumadocs-mdx && tsc --noEmit
cd docs && bun run build          # bun gen:cf-types && vite build
cd docs && bun run deploy         # wrangler deploy (Cloudflare Workers)
```

There is no test infrastructure anywhere in the repo — no test files, no vitest/jest/playwright config, no test scripts. Quality gates are only `check:lint` and `check:types` per package.

### Per-package typecheck

Always run `tsc -b` in the package whose path alias you mean — the `@/*` alias resolves differently per tsconfig (each package maps it to its own `./src/*`).
