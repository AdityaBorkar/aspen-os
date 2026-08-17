# Coding Conventions

Current codebase facts. Every item below matches code.

## How to use this file

This file is the **exhaustive code-facts reference**. `AGENTS.md` is the always-loaded pointer layer for invariants + commands. Keep detail here; extend this file when facts overlap, then point from `AGENTS.md` — never create a third copy.

Task routing:

- **Write a new module** → follow `.agents/skills/write-module/SKILL.md`; use §Domain modules, §Database, §Validation, §Events, §Workflows, §Auth as template.
- **Add / change a table or column** → §Database
- **Add / change input validation** → §Validation
- **Add / change an event or workflow** → §Events, §Workflows
- **Add / change ACL or auth** → §Auth (better-auth + ACL)
- **Understand platform, units, lifecycle, or navigation** → §Repository overview, §Platform architecture, §RPC
- **Name anything** → §Naming summary
- **Build / typecheck / verify** → §Commands & verification, esp. `### Build gotcha`

Section order: navigation; contiguous write bundle (`Domain modules` → `Database` → `Validation` → `Events` → `Workflows` → `Auth` → `PubSub`); `RPC`; lookup + operations. Put each fact in its owning section — never append.

## Repository overview

- **Bun monorepo** (`@aspen-os`): business framework (`@aspen-os/platform`), pluggable **units** (infrastructure), **modules** (domain logic), first-class multi-tenancy, Fumadocs site (`docs`).
- **No host/example app** yet (first app intended: "Recruiter"). No `examples/` dir.
- **Workspace state**: `platform`, `masters`, `organization`, `compliance`, `tasks`, `calendar`, `dms`, `management`, `hr`, `workspace`, `notes` fully implemented (all modules conform to `Module` interface), plus `constants` (shared enums). `drive` **removed from repo** — file/folder/label/share/trash surface consolidated into `dms` (`.working-docs/sow/dms-consolidation.md`). Task reminders moved to `calendar` (`.working-docs/sow/calendar.md`); note concept moved to `notes` (`.working-docs/sow/notes.md`); dms pins moved to `workspace` (`.working-docs/sow/dms-pins-removal.md`). `crm`, `fleet`, `inventory`, `reports` are not-started stubs.
- Domain model lives in `.working-docs/` (`DOMAIN_MODEL.md` + `domain-model/<package>.md`, `BOUNDED_CONTEXTS.md` + `bounded-contexts/<package>.md`, `TODO.md`, `adr/`, `sow/`, `todo/`). `docs/` = built Fumadocs site, **not** domain-doc source.

## General

- **Runtime**: Bun (not Node.js)
- **Package manager**: Bun workspaces (`bun install`)
- **Language**: TypeScript, ESM only (`"type": "module"`)
- **Linter/formatter**: oxlint (`.oxlintrc.json`) + oxfmt (`.oxfmtrc.json`) — tools enforce style.
- **No barrel files** unless explicitly told. Platform has no root export — import via subpaths (`@aspen-os/platform/server`, `@aspen-os/platform/client`, `@aspen-os/platform/server/db-schemas`). Module-internal workflow aggregates exist as `workflows/index.ts` routers in `dms`, `notes`, `masters`, `calendar`, `compliance`, `workspace`, and `hr`.
- **Gitignore**: `node_modules`, `.output`, `.build`, `.tanstack`, `.source`, `.wrangler`, `.nitro`, `.local`, `.cache`, `*.tsbuildinfo`, `.DS_Store`, `*.gen.ts`, `worker-configuration.d.ts`, `codedb.snapshot`, `.env*` except `.env.example`.
- **Build step**: `platform`, `organization`, `masters`, `notes`, `calendar`, `management`, `dms`, `workspace`, `constants` have `build` script (`bun run build` → `scripts/build.ts` → `.output/`). All except `constants` carry `build` config rewriting `exports`/`bin` to `.output/`; `constants` emits declarations to `.output/` but keeps `exports` at `./src/index.ts`. Raw-src packages (`compliance`, `tasks`, `hr`) export raw `.ts`.

### Toolchain (oxlint + oxfmt)

- `.oxlintrc.json`: ignores `.agents/**`, `tools/**`; loads local `anti-slop` JS plugin; enables type-aware/type-check linting plus import, JSDoc, JSX-a11y, Node, promise, React, React-perf, TypeScript, Oxc, Unicorn. `correctness` = error; `perf`, `style`, `suspicious` = warnings.
- `.oxfmtrc.json`: sorts imports by configured groups (including protocol imports) and Tailwind classes (via `clsx`, `cva`, `tw`, `cn`); no explicit generated-directory skip list.

### TypeScript configuration

Root `tsconfig.json` (extended by packages):

- `strict: true`, `noUncheckedIndexedAccess: true`, `noUncheckedSideEffectImports: true`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ESNext"`, `lib: ["ESNext"]`, `moduleDetection: "force"`, `jsx: "react-jsx"`
- `composite: true` w/ project references to workspace packages + `docs`
- `declaration: true`, `declarationMap: true`, `emitDeclarationOnly: true`, `declarationDir: "./.local/types/root"`
- `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noUnusedLocals: true`
- `noUnusedParameters: false`, `noPropertyAccessFromIndexSignature: false`
- `skipLibCheck: true`, `types: ["bun", "@types/bun"]`, `allowJs: true`
- Excludes `**/node_modules`, `**/.output`, `**/.tanstack`, `tools/**`

**Path-alias gotcha**: each package maps `#/*` to its own `./src/*`; root tsconfig has no `paths`. Run `tsc -b` in the package whose alias you mean.

### bunfig.toml

- `telemetry=false`, `logLevel="warn"`
- `[console] depth = 10`
- `[run] bun=true`, `silent=false`
- `[install] ignore-scripts=true`, `minimumReleaseAge=259200` (3-day minimum), `saveTextLockfile=false` (binary lockfile `bun.lockb`)

### Workspace catalog

Shared dependency versions pinned in root `package.json` `workspaces.catalog`, referenced as `catalog:` in workspace packages. Current catalog: `@standard-schema/spec`, `@standard-schema/utils`, `@types/bun`, `bun`, `drizzle-kit`, `drizzle-orm`, `typescript`, `valibot`.

### Dependencies

- Workspace packages depend on each other via `"workspace:*"` (`@aspen-os/constants`, `@aspen-os/platform`, …).
- Toolchain/ORM/validation deps from catalog via `catalog:`.
- Infra-level deps pinned concretely w/ caret ranges (e.g. `pg ^8.23.0`, `pg-boss ^10.4.2`, `better-auth ^1.6.26` + `@better-auth/api-key`/`@better-auth/passkey`, `@aws-sdk/client-s3`, `fflate ^0.8.3`).
- No package declares `packageManager` field; `bun` itself only a catalog dependency of `@aspen-os/platform`.

## Platform architecture

Three server classes share abstract `BasePlatform<M, S>` (`src/server/base-platform.ts`):

| Class                    | `create()` config                                           | `run()`             | Tenant DB                                                         |
| ------------------------ | ----------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| `SingleTenantPlatform`   | `SingleTenantConfig` (`db: DatabaseConfig`)                 | `run(fn)`           | control-plane — no scoping                                        |
| `SharedTenantPlatform`   | `SharedTenantConfig` (`db: DatabaseConfig`)                 | `run(tenantId, fn)` | RLS: transaction + `app.tenant_id` + `SET LOCAL ROLE tenant_role` |
| `IsolatedTenantPlatform` | `IsolatedTenantConfig` (`db: IsolatedTenantDatabaseConfig`) | `run(tenantId, fn)` | DB-per-tenant via `TenantResolver`                                |

- Three classes use `static create(config, modules)` and mode-specific, non-overloaded `run()` signatures.
- `PlatformInstance<M[]>` is the CLI structural type; use `SingleTenantPlatformInstance<M>` etc. for typed `run()`.
- `isGlobalTenantId(tenantId)` is true for `"$global"`; global IDs route to control-plane DB in shared/isolated modes.
- Single + shared modes flagged "currently EXPERIMENTAL" via `console.warn` at construction.
- `SharedTenantPlatform` overrides `$prepareInfra()` to call `DatabaseUnit.applyRlsPolicies()` after base flow; `IsolatedTenantPlatform` overrides `$prepareInfra()` entirely (db first, then auth, then remaining units, then `$prepareRuntime`, then `mod.$prepareTenant(tenantId)` for each `resolver.list()` tenant; inline resolver is `{ list: [], resolve: identity }`).
- `BasePlatform.healthCheck()` probes DB (`SELECT 1`) + pubsub (`getQueueSize`) and marks `"unhealthy"` when produced topics lack subscribers.

### Example

```ts
const platform = SingleTenantPlatform.create(config, [
  Masters.create(),
  Organization.create({ country: "INDIA" }),
  Compliance.create({ country: "INDIA" }),
]);

await platform.$prepareInfra();
await platform.run(async () => {
  /* inside AsyncLocalStorage */
});
await platform.$cleanup();
```

### Unit interface (server)

```ts
interface Unit {
  readonly $name: string;
  $cleanup: () => Promise<void>;
  $prepareInfra?: () => Promise<void>;
}
```

- `$prepareInfra` is optional and has no arguments in the public `Unit` interface. `DatabaseUnit` and `AuthUnit` expose narrower concrete signatures for direct callers.
- `$name`, `$cleanup`, `$prepareInfra` use `$` lifecycle prefix.

### Modules

```ts
interface Module<
  N extends string = string,
  TCP extends SchemaMap = SchemaMap,
  TT extends SchemaMap = SchemaMap,
> {
  $cleanup: () => void | Promise<void>;
  readonly $name: N;
  readonly $dependencies: readonly string[];
  $initialize: (units: any) => void;
  $prepareInfra: () => ModuleInfra<TCP, TT>;
  $prepareRuntime: () => void | Promise<void>;
  $prepareTenant?(tenantId: string): Promise<void>;
}
```

- All methods required except optional, isolated-only `$prepareTenant`.
- `$initialize` receives the full runtime unit map; public type uses `any`, while modules type their dependency subset (e.g. `{ db, auth, pubsub }`).
- Synchronous `$prepareInfra()` returns:

```ts
type ModuleInfra<TCP extends SchemaMap = SchemaMap, TT extends SchemaMap = SchemaMap> = {
  auth: { acl: Record<string, readonly string[]> };
  db: { control_plane_schemas: TCP; tenant_schemas: TT };
  events: Record<string, Record<string, string>>;
};
```

- `events` = **type-level contract only** — carried in `ModuleInfra`; platform has no runtime event side effect.
- Modules declare ACL w/ `defineAcl({ resource: ["create", "read", "update", "delete", ...] })` (identity fn w/ `const` generic for literal inference).

### Lifecycle (`createCore` → `$prepareInfra` → `run` → `$cleanup`)

1. `Platform.create(config, modules)` → `BasePlatform.createCore()` constructs eight units around supplied `db`, validates `$dependencies`, calls `mod.$initialize(units)`, returns a **Proxy** resolving unit keys before module `$name`.
2. `p.$prepareInfra()`:
   - every `unit.$prepareInfra?.()` (try/catch wrapped);
   - each `mod.$prepareInfra()`, merging `control_plane_schemas`/`tenant_schemas` and concatenating ACL actions per resource;
   - `db.prepareWithModules(...)` (pushes core + merged control-plane schemas, stores tenant schemas); `auth.applyModuleAcl(mergedAcl)` (recreates better-auth service w/ `admin({ ac: createAccessControl(acl) })`);
   - `mod.$prepareRuntime?.()` inside `runInContext(...)`.
3. `p.run(fn)` — `fn` runs inside `AsyncLocalStorage`; `getContext()` exposes required `db`/`pubsub`, optional `audit`/`auth`/`tenantId`/`actorId`/`requestId`/`traceId`, and reserved optional `log`/`rpc`/`kvStore`/`storage`/`workflows` fields typed as `null`. `BasePlatform.runInContext()` populates only `audit`, `auth`, `db`, `pubsub`, and optional `tenantId`/`db` overrides.
4. `p.$cleanup()` — module `$cleanup()` (in context), then unit `$cleanup()`, each try/catch wrapped.

`IsolatedTenantPlatform` overrides `$prepareInfra()` entirely: db first, then auth, then other units, then `$prepareRuntime`, then `mod.$prepareTenant(tenantId)` for each tenant from `resolver.list()`.

### Eight required units

All units:

| Unit                    | `$name`     | Injected deps                | Notes                                                                   |
| ----------------------- | ----------- | ---------------------------- | ----------------------------------------------------------------------- |
| `db` (DatabaseUnit)     | `"db"`      | — (owns `pg.Pool` + drizzle) | tenancy, RLS, `prepareWithModules`; the load-bearing unit               |
| `auth` (AuthUnit)       | `"auth"`    | `{ db, pubsub }`             | better-auth service, `fetchHandler`, `rest` getter, `applyModuleAcl`    |
| `audit` (AuditUnit)     | `"audit"`   | `{ db }`                     | `diff`/`write`/`query`/`reconstructState`/`count`; `audit_log` table    |
| `logs` (LogUnit)        | `"logs"`    | `{ db }`                     | buffered pino-style logger; `child()`, `query`, `getStats`              |
| `pubsub` (PubSubUnit)   | `"pubsub"`  | `{ db }`                     | single control-plane pg-boss, **lazily started**                        |
| `storage` (StorageUnit) | `"storage"` | `{ db }`                     | S3 adapter (SeaweedFS-compatible) + file metadata, tenant-prefixed keys |
| `rpc` (RpcUnit)         | `"rpc"`     | `{ auth, db, logs, pubsub }` | oRPC `RPCHandler`; built-in `echo` + `health.check`                     |
| `kvStore` (KvStoreUnit) | `"kvStore"` | `{ db }`                     | Postgres-backed; `get`/`set`/`del`/`increment`/…                        |

`PlatformUnits<S>` accessors: `audit, auth, db, kvStore, logs, pubsub, rpc, storage`.

### Module registration and accessors

- Pass modules as array to `Platform.create(config, modules)`; no `registerModule()`. Modules declare `$dependencies` (e.g. management's `["organization"]`).
- Proxy access: `platform.organization` returns module; `platform.db` returns unit.
- `platform.getModule("name")` is typed and throws if missing.
- `platform.getUnit("name")` is typed (e.g. `getUnit("kvStore")`, `getUnit("logs")`; keys are camelCase).

### Package exports

`@aspen-os/platform` subpaths: `./server`, `./client`, `./server/db-schemas`. Published `exports`/`bin` target built `.output/`; `bin` exposes `aspen` CLI.

### Client platform

- `src/client/index.ts` — browser `Platform` with 3 units (`auth`, `logs`, `rpc`), a Proxy, and `run(fn)` setting `{ auth, logs, rpc }` in client context.
- Client `Unit<Config>` = `{ readonly $config: Config; readonly $name: string }`; client `Module` = `{ readonly $name: N }`. Client units use `$` name prefix but have **no** lifecycle methods.

### CLI (aspen)

- Commander CLI at `src/cli/index.ts`, `#!/usr/bin/env bun`.
- Dynamically imports app config (`platform || p` export), typed as `PlatformInstance<Module[]>`.
- Commands: `db-studio` (`-c/--config`, `-p/--port`, `-h/--host`, `-t/--tenant`) and `tenants` (`-c/--config`, isolated only).

## Domain modules

### Conforming-module shape

Every implemented module (organization, masters, compliance, tasks, calendar, dms, management, hr, workspace, notes) follows same shape: `src/module.ts` class, `src/auth.ts` ACL, `src/pubsub.ts` events, `db-schemas/` directory, workflows under REST-style `workflows/<entity>/<verb>.ts` folders (nested subresources, e.g. `class/field/add.ts`; scoped queries use `by-<qualifier>`, e.g. `comment/by-task/list.ts`). Most actions have separate files; some files define multiple or handler-only workflows. Reusable `WorkflowStep`s live in `workflow-steps/`. Workflow groups are `readonly` properties composed from imported consts; unit-bound groups use getters — management's `createX(this.#db)` for `tenants`, masters' `connections` binding `createConnection`/`rotateConnectionCredential` to `#kvStore`.

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

### Stateless vs runtime-wired modules

- **Stateless** (organization, tasks, notes): empty `$initialize()` / `$prepareRuntime()` / `$cleanup()`; `readonly` workflow groups.
- **Runtime-wired** (compliance, calendar, dms, workspace, hr): keep `#private` unit refs set in `$initialize(units)` + `async $prepareRuntime()` / `$cleanup()` that register/unregister pubsub schedules and applicable handlers; workflow groups remain `readonly`.
  - `compliance` — `{ db, kvStore, pubsub }`; reminder schedules + handlers in `$prepareRuntime()`, unregister + null refs in `$cleanup()`.
  - `calendar` — `Record<string, Unit>` → `{ db, pubsub }` (type guards); reminder-dispatcher cron (`calendar:reminder-scan`) + task bridge; config in `runtime.ts` (`setCalendarConfig`/`getCalendarConfig`).
  - `dms` — `Record<string, Unit>` → `{ db, pubsub, storage }` (type guards, no auth); expiry-scan + auto-purge schedules/handlers; module runtime state in `runtime.ts` (`setDmsConfig`/`setDmsStorage`/`getDmsConfig`/`getDmsStorage`).
  - `workspace` — `Record<string, Unit>` → `{ db, pubsub }` (type guards); per-schedule pg-boss crons `workspace:schedule:<id>`; `runtime.ts` holds config + view-resolver registry (`registerViewResolver`/`getViewResolver`).
  - `hr` — `{ db, pubsub }`; schedules/unschedules daily attendance-sync + leave-accrual crons, no handlers; `workflows/index.ts` composes per-entity workflow groups.
  - `management` — `{ db, auth, pubsub }`, stores only `#db`; empty `$prepareRuntime()`/`$cleanup()`; `tenants` getter throws if `#db` null, `serviceProviders`/`users` `readonly`; `$dependencies: ["organization"]`.
  - `masters` — hybrid `{ db, kvStore }`; stateless `readonly` groups + `connections` getter binding `createConnection`/`rotateConnectionCredential` to `#kvStore` (throws if uninitialized); empty `$prepareRuntime()`/`$cleanup()`.

Key conventions:

- Class `implements Module`; static `create(config)` factory; `readonly $config`.
- `$name` is a kebab-case readonly string; `$dependencies` is `readonly string[]` (typed `[]` when empty).
- `$prepareInfra()` returns `{ auth: { acl }, db: { control_plane_schemas, tenant_schemas }, events }`.
- Expose workflow groups as `readonly <entity> = <workflows>` properties; prefer composition over getters.

### File structure

```
packages/<module>/
  docs/                 # Fumadocs source: index.mdx, overview.mdx, meta.json + domain pages
  src/
    index.ts            # Module class + type re-exports (re-exports from module.ts + types.ts)
    module.ts           # Module class (implements Module, static create, lifecycle methods)
    auth.ts             # defineAcl({ ... }) (flat file; NOT utils/acl.ts)
    pubsub.ts           # Event constants + typed event interfaces + EventMap
    types.ts            # Type re-exports from schemas + module-specific interfaces (e.g. DmsModuleConfig)
    constants.ts        # Module-specific enums (as const objects) — or utils/constants.ts [optional]
    runtime.ts          # Module-scope runtime state (dms, calendar, workspace): config (+ storage, view-resolver registry)
    utils/
      strip-undefined.ts  # stripUndefined helper
    db-schemas/         # directory form (all domain modules):
      index.ts          #   exports control_plane_schemas + tenant_schemas
      enums.ts          #   shared pgEnum definitions referencing utils/constants
      <entity>.ts       #   per-entity drizzle pgTable definitions
    schemas/
      index.ts          # Re-exports all schemas + types (separate export type / export blocks)
      enums.ts          # Valibot enum schemas mirroring constants
      utils.ts          # Shared valibot schema utilities (regex, lengths)
      <entity>.ts       # Per-entity valibot schemas
    workflows/
      <entity>/
        <verb>.ts           # Usually one or more Workflow definitions; input schema is optional
        <subresource>/<verb>.ts
      index.ts              # Module-internal workflow router
      utils.ts              # Shared workflow helpers
    workflow-steps/       # Reusable WorkflowStep.name(...).handler(...) consts (fetch-<entity>.ts)
  services/           # Cross-cutting services [optional]
      <service>.ts
  package.json
  tsconfig.json
```

### Package conventions

- Package name: `@aspen-os/<module>`
- `"type": "module"`; dependencies on other workspace packages via `"workspace:*"`, catalog versions via `catalog:`
- `exports`: `"."` → `"./src/index.ts"` (raw TS) **except** `@aspen-os/platform`, `@aspen-os/organization`, `@aspen-os/masters`, `@aspen-os/notes`, `@aspen-os/calendar`, `@aspen-os/management`, `@aspen-os/dms`, `@aspen-os/workspace` which build to `.output/` via `scripts/build.ts`
- Scripts: `check:lint` (`oxlint --fix . ; oxfmt .`) + `check:types` (`tsc -b`)

### Stub packages

`@aspen-os/crm|fleet|inventory|reports`: package files contain the package name plus the local `#/*` import alias, with no exports/dependencies/scripts; `src/index.ts` is empty, and `docs/` holds only `index.mdx` + `meta.json` describing a "not-started" stub.

## Database

### IDs

- Domain/platform core IDs use the `uuidv7` Drizzle column type exported from `@aspen-os/platform/server` (defined in `src/server/db/schema/data-types.ts`): `id: uuidv7("id").primaryKey()`. It maps to SQL `text` and bakes in the insert-time JS `generateUuidv7()` default, avoiding DB-side `sql\`uuidv7()\`` magic.
- Exception 1: better-auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `apikey`, `twoFactor`, `passkey`) use `text("id").primaryKey()` without default; better-auth manages IDs (`bun run gen:auth-schema`).
- Exception 2: `management.tenant.id` uses `text("id").primaryKey()` without default; onboarding supplies the ID.
- The raw generator stays available as `generateUuidv7()` from `@aspen-os/platform/server` for places that need a UUIDv7 string outside a column default.
- Workflow run/step schemas use `uuidv7("id")` defaults, but the engine supplies `crypto.randomUUID()` IDs.

### Timestamps

- Domain/core tables use `timestamp("...", { withTimezone: true })`; generated better-auth tables use timezone-less `timestamp(...)`.
- Domain/core `createdAt` fields use `.notNull().defaultNow()`.
- `updatedAt` generally uses `.notNull().defaultNow()`; some schemas add `$onUpdate(() => new Date())`, and workflows often set `updatedAt` explicitly.
- `date` columns (e.g. `foundedDate`, `openedDate`, `expiryDate`) use Drizzle's `date()` type. Date workflows commonly convert `Date` via `.toISOString().split("T")[0]`; HR employee date fields accept/persist strings.

### Table and column naming

- Table names: `snake_case` (e.g. `connection_contact`, `dms_file`, `kv_store`, `workflow_runs`). DMS tables carry `dms_` prefix (`dms_file`, `dms_label`, `dms_share`, …).
- Column names: `snake_case` in Postgres, `camelCase` in TypeScript (drizzle maps between them).
- Table definitions sort columns alphabetically by TS property name.

### Enums

- Use `pgEnum("snake_case_name", [...values])` (DMS enum names also carry `dms_` prefix: `dms_entity_type`, `dms_file_status`, …).
- Enum values reference constants objects when available: `pgEnum("compliance_category", [COMPLIANCE_CATEGORY.TAX, ...])`.
- Enum values lowercase strings.

### Indexes

- Ordinary indexes use `idx_<table>_<column>` (e.g. `idx_address_country`). Unique indexes use `uniqueIndex` with existing `idx_`, `uq_`, or descriptive names.
- Indexes live in table's third argument as an array of `index()` calls or object map.
- DMS adds GIN full-text indexes named `idx_<table>_search` built over `to_tsvector` expressions (name + description + metadata + field values).

### Other column types

- `jsonb("metadata")` for flexible metadata — often `.default({})`.
- `numeric` for monetary/decimal values (e.g. `annual_revenue`, `contract_value`).
- `integer` for counts/capacity, `bigint("...", { mode: "number" })` for file sizes.
- `text("...").array().default([])` for array fields (e.g. tags).
- `boolean` fields use `.notNull().default(boolean)` pattern.

### Foreign keys

- Generated better-auth tables use explicit references such as `text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })`.
- Domain tables generally store related IDs as plain `text` without Drizzle foreign keys; do not assume cascade behavior.

### Relations

- Drizzle `relations()` and `one()`/`many()` currently appear in generated better-auth schema; domain schemas generally have none.

### Schema management

- **`pushSchema()`** from `drizzle-kit/api`, not migration files (see ADR 0004).
- `DatabaseUnit.$prepareInfra()` pushes core schemas (auth, audit, logs, kv-store, storage, workflows) + passed control-plane schemas via `getSchemas()`; stores tenant schemas.
- Modules return control-plane + tenant schemas from `$prepareInfra()`; `BasePlatform` merges them and `prepareWithModules` currently pushes only control-plane schemas. `pushSchemasToTenant()` and isolated `provisionTenant()` apply core + tenant schemas to isolated databases.
- Data-loss warnings log, but push proceeds.

## Validation

### Valibot (domain modules)

Used for domain create/update/filter schemas and most workflow input validation.

- Schema names: `Create<Entity>Schema`, `Update<Entity>Schema`, `<Entity>FiltersSchema`
- Type names: `Create<Entity>Input`, `Update<Entity>Input`, `<Entity>Filters`
- Types derive via `InferOutput<typeof Schema>`.
- Schemas + types co-export in separate `export type {}` + `export {}` blocks (verbatimModuleSyntax).
- `Workflow.input(schema)` runs Standard Schema validation before handlers; handlers may call `parse(Schema, input)` for narrowed or extra checks.
- Shared validators live in `schemas/utils.ts` (e.g. `NameSchema`, `SlugSchema`, `CountryCodeSchema`, `EmailSchema`).

### Zod

Platform declares `zod` and RPC docs show `z.object({ ... })`, but RPC source has no Zod input schemas and repo has no `t3-env` environment schema source.

### Constants and enums

- Constants as `as const` objects w/ `UPPER_SNAKE` keys + lowercase string values.
- Types derived via indexed access: `type X = (typeof OBJ)[keyof typeof OBJ]`.
- Shared constants in `@aspen-os/constants` — `src/index.ts` holds shared enums (`ORGANIZATION_STATUS`, `BRANCH_TYPE`, `COMPLIANCE_CATEGORY`, `COUNTRY_CODES` + `isValidCountryCode` guard, …); `src/country-codes.ts` / `src/languages.ts` empty stubs.
- Module-specific constants in module's `constants.ts` (or `utils/constants.ts`).
- Valibot `enum_()` schemas in `schemas/enums.ts` mirror constant objects.
- `pgEnum` values reference constant objects.
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
- Constants use `UPPER_SNAKE` keys.

### Typed events

Each event has an interface:

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

- Module `events = { ENTITY_EVENTS }` passes through `ModuleInfra.events` as type-level contract; payload maps (`*DomainEventMap`) compose by intersection.

## Workflows

- Durable builder: `Workflow.name("domain.action").input(Schema).handler(fn)` → `WorkflowInstance.run(input, options?)`; reusable `WorkflowStep.name(name).handler(fn)` runs via `ctx.step.run(step, input, options?)`, `ctx.step.run("name", fn, options?)`, or `ctx.step.sleep(ms)`.
- Module workflows are exported consts under REST-style `workflows/<entity>/<verb>.ts` folders (nested subresources, e.g. `class/field/add.ts`), usually one action per file but sometimes several; compose into `module.ts` groups (`readonly serviceProviders = { create: createSp, ... }`). Reusable `WorkflowStep`s live in `workflow-steps/`; `services/` facades may use `Parameters<typeof x>[0]` typing.
- `ctx.step.run` is **idempotent/durable**: completed `workflow_steps` replay from cache; retries up to `options.retries`.
- Persisted in `workflow_runs` / `workflow_steps` (`status`: `running|completed|failed`; steps add `pending|skipped`).
- `WorkflowContext` = `{ actorId?, audit, auth?, config, db, pubsub, runId, step }`; `RunOptions` (`actorId?`, `audit?`, `auth?`, `config?`, `db?`, `pubsub?`) overrides `getContext()` defaults.
- `ctx.pubsub.publish(EVENTS.X, payload)` emits events.
- Module workflows use `Workflow`; most insert/update mutations use `.returning()`, but some return constructed values. Optional fields commonly use `?? null`; validate business rules before DB ops where needed.

## Auth (better-auth + ACL)

- **better-auth** plugins: `admin`, `username`, `organization`, `phoneNumber`, `emailOTP`, `apiKey`, `twoFactor`, `passkey`. `LastLoginMethod()` is commented on server; `LastLoginMethodClient` + `CaptchaClient` on client.
- Modules define permission matrices (`{ resource: [actions...] }`) with `defineAcl` in flat `src/auth.ts`; platform implementation lives in `server/auth/utils/acl.ts`.
- `AuthUnit.applyModuleAcl(acl)` recreates better-auth w/ `admin({ ac: createAccessControl(acl) })` during `$prepareInfra()`.
- Drizzle adapter: `camelCase: false`, `provider: "pg"`, `usePlural: false`, `transaction: true`.
- Adapter binds `db.controlPlaneDb`; auth is control-plane only.
- Role = plain `text("role")` on `user`, not a separate table.
- Auth tables (`auth/db-schema.ts`, 10 tables) do **not** follow `uuidv7()` IDs; better-auth manages IDs. Generate via `bun run gen:auth-schema` (`bunx auth generate --config ./src/server/auth/~config.ts --output ./src/server/auth/db-schema.ts`).
- `rest` exposes REST `resource.action`: `user.{create, get, remove, role.assign, role.unassign, update}`, `session.{create, invalidate, validate}`, `role.{list, remove}`. Use `remove`, not `delete`.

## PubSub

- **pg-boss** queue/pub-sub: one control-plane boss, **lazily started** on first use (not in `$prepareInfra()`).
- `publish(topic, data, options?)` / `publishBatch(topic, messages)` / `subscribe(topic, handler)` / `unsubscribe` / `schedule({ topic, cron, data?, options? })` / `unschedule` / `getSchedules` / `purgeQueue`.
- **Silent-drop pitfall**: no queue row (no `subscribe()` → `boss.work()`) makes `publish()` return `null` and drops message. `getUnsubscribedProducedTopics()` tracks produced topics without subscribers; `BasePlatform.healthCheck` reports `"unhealthy"`.
- Runtime-wired modules register schedules and applicable handlers in `$prepareRuntime()`, unregister in `$cleanup()`.
- Health check probes via `boss.getQueueSize(topic)`, not `send()`.

## RPC

- **oRPC** (`@orpc/server`) provides framework RPC procedures; domain modules do **not** define procedures.
- Base procedures in `src/server/rpc/procedures/` (`echo.ts`, `health-check.ts`) compose into nested `router.ts`: `{ echo: procedure, health: { check: procedure } }`.
- `RpcUnit` serves them via `@orpc/server/fetch` `RPCHandler` (default prefix `/api/rpc`).
- Built-in procedures have no input schemas. RPC docs show a Zod example; package source currently has no Zod RPC validation.

## Git hooks (Husky)

- **pre-commit**: `bunx lint-staged` → `oxfmt` on staged files (root `lint-staged` config `"*": "oxfmt"`)
- **commit-msg**: `bunx commitlint --edit $1` → conventional commits
- Allowed commit types: `build chore ci docs feat fix perf refactor revert test wip`

## Naming summary

| Scope                   | Convention                            | Example                                                             |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Files                   | `kebab-case`                          | `auth.ts`, `pubsub.ts`, `db-schemas/index.ts`                       |
| Classes                 | `PascalCase`                          | `OrganizationWorkflow`, `DatabaseUnit`                              |
| Constants               | `UPPER_SNAKE_CASE`                    | `ORGANIZATION_STATUS`, `COMPLIANCE_EVENTS`                          |
| DB tables               | `snake_case`                          | `connection_contact`, `dms_file`                                    |
| DB columns              | `snake_case` (mapped to camelCase TS) | `created_at` → `createdAt`                                          |
| Event topics            | `domain:event_name`                   | `organization:updated`                                              |
| Private fields          | `#` prefix                            | `#documents`, `#db`, `#pubsub`                                      |
| Unit lifecycle (server) | `$` prefix                            | `$name`, `$prepareInfra`, `$cleanup`                                |
| Module lifecycle        | `$` prefix                            | `$initialize`, `$prepareInfra`, `$prepareRuntime`                   |
| Package exports         | `@aspen-os/<name>`                    | `@aspen-os/platform`, `@aspen-os/organization`, `@aspen-os/masters` |
| Module `$name` property | `kebab-case` string                   | `"organization"`, `"compliance"`                                    |

## Commands & verification

Root (`/`):

```
bun install            # install all workspace deps
bun run check:lint     # oxlint --fix . ; oxfmt .
bun run check:types    # tsc -b (root composite, all project references)
bun run update:deps    # taze -rw --maturity-period 3
bun run clean          # bunx rimraf --glob "**/{node_modules,.output,.local,bun.lockb}"
bun run prepare        # husky
```

Platform / built packages:

```
cd packages/platform && bun run check:types
cd packages/platform && bun run check:lint
cd packages/platform && bun run build          # scripts/build.ts → .output/
```

### Build gotcha (`.output/`)

`platform`, `organization`, `masters`, `notes`, `calendar`, `management`, `dms`, `workspace` publish `exports`/`bin` pointing at `.output/` (build rewrites each package's `package.json` in place; `git status` shows it modified). TypeScript resolves types from `.output/`, not source. After changing exports, run `bun run build` **before** typechecking downstream packages (raw-src packages like `tasks`/`compliance`/`hr` resolve platform/types through `.output/`). `bun run build --dev` rewrites `exports`/`bin` back to `./src/*` (un-builds without emitting). Fresh clone or `bun run clean` wipes `.output/` — the `.output`-exporting packages must be rebuilt before downstream typechecking.

Docs (`bun run dev` → 3005):

```
cd docs && bun run dev            # vite dev --port 3005
cd docs && bun run check:types    # fumadocs-mdx && tsc --noEmit
cd docs && bun run build          # bun gen:cf-types && vite build
cd docs && bun run deploy         # wrangler deploy (Cloudflare Workers)
```

### Docs gotchas

`ignore-scripts=true` (bunfig) blocks `postinstall` MDX generation (`fumadocs-mdx`); run `bunx fumadocs-mdx` if `.source/` is missing before build/typecheck. `gen:cf-types` writes gitignored `worker-configuration.d.ts`. Docs use `@tanstack/react-start` + Vite; `wrangler.jsonc` defines `preview`/`production` environments w/ custom domains.

### Test infrastructure

No package test scripts or Vitest/Jest/Playwright setup. Maintained custom oxlint anti-slop suite:

```
cd tools/oxlint/anti-slop && bun test
```

Package quality gates: `check:lint` + `check:types`.

### Per-package typecheck

Run `tsc -b` in the package whose path alias you mean — `#/*` resolves per tsconfig (each package maps it to its own `./src/*`).
