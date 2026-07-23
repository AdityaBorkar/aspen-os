# Coding Conventions

Conventions extracted from the codebase as it exists today. Every item below is reflected in actual code.

## General

- **Runtime**: Bun (not Node.js)
- **Package manager**: Bun workspaces (`bun install`)
- **Language**: TypeScript, ESM only (`"type": "module"`)
- **Linter/formatter**: Biome — double quotes, 2-space indent, LF, `lineWidth: 80`, organized imports
- **No barrel files** unless explicitly told
- **No build step**: package `exports` point at raw `.ts` files (e.g. `"./src/index.ts"`)
- **`*.gen.ts`** files are gitignored (codegen output)

### TypeScript configuration

Root `tsconfig.json` (extended by all packages):

- `strict: true`, `noUncheckedIndexedAccess: true`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ESNext"`
- `composite: true` with project references to every workspace package
- `declaration: true`, `declarationMap: true`, `emitDeclarationOnly: true`
- `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noUnusedLocals: true`
- `noUnusedParameters: false`, `noPropertyAccessFromIndexSignature: false`
- `skipLibCheck: true`, `types: ["bun"]`

**Path-alias gotcha**: `@/*` resolves differently per tsconfig — root maps to `./examples/recruiter/src/*`, framework maps to `./packages/framework/src/*`. Run typecheck in the package whose alias you mean.

### Biome configuration

- Import groups (in order): URL imports → blank → Node/Bun/package-with-protocol → blank → bare packages → blank → aliases/paths
- `sortBareImports: true`
- `useSortedClasses: error` for Tailwind class sorting via `clsx`, `cva`, `tw` (with `attributes: ["classList"]`)
- Linter domains enabled: `react: all`, `tailwind: all`, `types: all`
- `src/components/ui/**` has linting disabled (shadcn/ui generated code)

### bunfig.toml

- `ignore-scripts=true` — install scripts disabled
- `minimumReleaseAge=259200` (3-day minimum release age), excluding `@types/bun`, `typescript`, `@biomejs/biome`
- `saveTextLockfile=false`

### Workspace catalog

Shared dependency versions are pinned in the root `package.json` `workspaces.catalog` and referenced as `catalog:` in workspace packages. Current catalog: `@types/bun`, `bun`, `drizzle-orm`, `typescript`, `valibot`.

## Database

### IDs

- Always `text` with `DEFAULT gen_random_uuid()::text` — never native UUID columns.
- Exception: better-auth tables (`user`, `session`, `account`, `verification`) use `text("id").primaryKey()` without a default (better-auth manages ID generation).

### Timestamps

- Always `timestamp("...", { withTimezone: true })` — never `timestamp without time zone`.
- `createdAt`: `.notNull().defaultNow()`
- `updatedAt`: `.notNull().defaultNow().$onUpdate(() => new Date())` (auth tables) or manually set `new Date()` in workflow methods.
- `date` columns (e.g., `foundedDate`, `openedDate`) use drizzle's `date()` type, converted from `Date` objects via `.toISOString().split("T")[0]`.

### Table and column naming

- Table names: `snake_case` (e.g., `connection_contact`, `file_metadata`, `kv_store`).
- Column names: `snake_case` in Postgres, `camelCase` in TypeScript (drizzle maps between them).
- Table definitions sort columns alphabetically by their TS property name.

### Enums

- Use `pgEnum("snake_case_name", [...values])`.
- Enum values reference constants objects when available: `pgEnum("compliance_category", [COMPLIANCE_CATEGORY.TAX, ...])`.
- Enum values are lowercase strings.

### Indexes

- Naming: `idx_<table>_<column>` (e.g., `idx_address_country`) or `<table>_<column>_idx` in auth tables (e.g., `session_userId_idx`).
- Indexes defined in the table's third argument as an array of `index()` calls or an object map.

### Other column types

- `jsonb("metadata")` for flexible metadata — often `.default({})`.
- `numeric` for monetary/decimal values (e.g., `annual_revenue`, `contract_value`).
- `integer` for counts/capacity.
- `bigint` for file sizes (`bigint("size", { mode: "number" })`).
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
- Platform's `DatabaseUnit.$prepare()` pushes core schemas (auth, logs, storage, kv-store) via `getSchemas()`.
- Domain modules push their own schemas in their `prepare()` method.
- Data-loss warnings are logged but the push proceeds.

## Platform

### Unit interface (server)

```ts
interface Unit {
  readonly $name: string;
  $cleanup(): Promise<void>;
  $prepare?(): Promise<void>;
}
```

Server units use the `$` prefix for lifecycle methods (`$name`, `$cleanup`, `$prepare`).

### Unit interface (client)

```ts
interface Unit {
  readonly name: string;
  destroy(): Promise<void>;
  prepare?(): Promise<void>;
}
```

Client units use no prefix.

### Module interface

```ts
interface Module<N extends string = string> {
  readonly name: N;
  initialize?(units: Record<string, Unit>): void;
  prepare?(): Promise<void>;
  destroy(): Promise<void>;
}
```

### Lifecycle

`Platform.create(config, modules)` → `prepare()` → `run(fn)` → `destroy()`.

- `create()` is a **static factory** — the only way to construct a Platform. It instantiates all 7 units, calls `module.initialize(units)` on each module, and returns a proxy-wrapped `PlatformInstance`.
- `prepare()` runs each unit's `$prepare()` then each module's `prepare()`. Errors are caught and logged per-unit/module.
- `run(fn)` executes `fn` inside `AsyncLocalStorage` providing `{ db: NodePgDatabase, pubsub: PubSubUnit }`.
- `destroy()` runs module `destroy()` then unit `$cleanup()`. Errors are caught and logged.

### Seven required units

All are required in `PlatformConfig`: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`. Units are constructor-injected with dependencies:

| Unit | Injected deps |
| --- | --- |
| `db` | — (owns `pg.Pool` + drizzle `db`) |
| `logs` | `{ db }` |
| `pubsub` | `{ db }` |
| `storage` | `{ db }` |
| `auth` | `{ db }` |
| `rpc` | `{ auth, db, logs, pubsub }` |
| `kvStore` | `{ db }` |

### Module registration

Pass all modules as a named object to `Platform.create(config, modules)`. There is no `registerModule()`. Module names become proxy keys — `platform.organization` returns the module directly.

### Accessors

- `platform.getUnit("name")` — typed, requires a name.
- `platform.getModule("name")` — typed, throws if not found.
- Or use proxy: `platform.moduleName`, `platform.unitName`.

### Package exports

`@aspen-os/platform` subpaths: `./server`, `./client`. The root `.` export re-exports types and `createAccessControl`.

## Domain modules

### Module class pattern

```ts
export class XxxModule {
  static create(config: XxxModuleConfig): XxxModule {
    return new XxxModule(config);
  }

  constructor(private config: XxxModuleConfig) {}

  readonly db_schema = dbSchema;
  readonly name = "xxx"; // kebab-case, matches module key

  #workflow1: Workflow1 | null = null;
  // ...

  get workflow1(): Workflow1 {
    if (!this.#workflow1) throw notInitialized();
    return this.#workflow1;
  }

  initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#workflow1 = new Workflow1(units.db.db);
    // ...
  }

  async prepare(): Promise<void> {
    // push schema, register schedules/handlers
  }

  async destroy(): Promise<void> {
    // unregister handlers, null out private fields
  }
}

function notInitialized(): Error {
  return new Error("Xxx module not initialized. Call initialize() after platform.initialize().");
}
```

Key conventions:

- Static `create(config)` factory.
- Private workflow fields with `#` prefix, initialized lazily in `initialize(units)`.
- Getter properties that throw `notInitialized()` if accessed before `initialize()`.
- `db_schema` export (the drizzle schema namespace).
- `name` as kebab-case readonly string.
- `prepare()` for schema push and handler/schedule registration.
- `destroy()` nulls out private fields and unregisters handlers.

### File structure

```
packages/<module>/
  src/
    index.ts              # Module class, type re-exports, dbSchema export
    db-schema.ts          # Drizzle pgTable/pgEnum definitions
    types.ts              # Type re-exports from schemas + domain interfaces
    event-map.ts          # Event constants + typed event interfaces + EventMap type
    constants.ts          # Module-specific enums (as const objects) [optional]
    schemas/
      index.ts            # Re-exports all schemas + types (separate export type / export blocks)
      enums.ts            # Valibot enum schemas mirroring constants
      utils.ts            # Shared valibot schema utilities (regex, lengths)
      <entity>.ts          # Per-entity valibot schemas
    workflows/
      <entity>.ts          # Business logic classes
    services/              # Cross-cutting services [optional]
      <service>.ts
  package.json
  tsconfig.json
```

### Package conventions

- Package name: `@aspen-os/<module>`
- `"type": "module"`
- `exports`: `"."` → `"./src/index.ts"` (raw TS, no build step)
- Dependencies on framework and constants via `"workspace:*"`
- Shared dep versions via `catalog:`
- Scripts: `check:lint` (`biome check --fix .`) and `check:types` (`tsc -b`)

## Validation

### Valibot (domain modules)

Used for all domain module input validation (create/update/filter schemas).

- Schema naming: `Create<Entity>Schema`, `Update<Entity>Schema`, `<Entity>FiltersSchema`
- Type naming: `Create<Entity>Input`, `Update<Entity>Input`, `<Entity>Filters`
- Types derived via `InferOutput<typeof Schema>`
- Schemas and types co-exported: separate `export type {}` and `export {}` blocks (verbatimModuleSyntax)
- Runtime validation: `parse(Schema, input)` at workflow method entry
- Shared validators in `schemas/utils.ts` (e.g., `NameSchema`, `SlugSchema`, `CountryCodeSchema`)

### Zod

Used in two specific contexts:

- **RPC procedures** (oRPC): `z.object({ ... })` for input validation
- **Environment variables** (t3-env): `z.string()`, `z.coerce.number()`, etc.

### Constants and enums

- Constants as `as const` objects with `UPPER_SNAKE` keys and lowercase string values.
- Types derived via indexed access: `type X = (typeof OBJ)[keyof typeof OBJ]`.
- Shared constants live in `@aspen-os/constants`.
- Module-specific constants live in the module's `constants.ts`.
- Valibot `enum_()` schemas in `schemas/enums.ts` mirror the constant objects.
- `pgEnum` values reference the constant objects.

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

## Workflows

- Classes with `constructor(private readonly db: NodePgDatabase) {}` (or with `pubsub` for modules that publish events).
- Standard methods: `get`, `create`, `update`, `delete` + domain-specific operations.
- Input validated via `parse(Schema, input)` at method entry.
- `.returning()` on insert/update to get the result row.
- Optional fields use `?? null` coalescing when mapping to DB values.
- Business rule validation before DB operations (e.g., uniqueness checks, hierarchy depth).
- `Date` objects converted to date strings via `.toISOString().split("T")[0]` for `date()` columns.

## Auth

- **better-auth** with plugins: `admin`, `username`, `phoneNumber`, `lastLoginMethod`, `twoFactor`, `passkey`, `captcha` (Cloudflare Turnstile).
- `createAccessControl` defines the permission matrix (`{ resource: [actions...] }`).
- Roles created via `access_control.newRole({ resource: [actions] })`.
- `access_control` and `roles` from `AuthConfig` are **not** passed to server-side `betterAuth()` — they are client-only (used by the admin plugin on the client).
- Drizzle adapter: `camelCase: false`, `provider: "pg"`, `usePlural: false`, `transaction: true`.
- Role is a plain `text("role")` column on `user` — not a separate table.
- Auth tables do not follow the `gen_random_uuid()::text` ID convention (better-auth manages IDs).

## PubSub

- **pg-boss** for job queue / pub-sub.
- `publish<T>(topic, data, options?)` / `subscribe<T>(topic, handler)`.
- `schedule(topic, cron, data?, options?)` for cron-based recurring jobs.
- Domain modules register schedules and handlers in `prepare()`.
- Modules unregister in `destroy()`.

## RPC

- **oRPC** (`@orpc/server`) for RPC procedures.
- Base context created via `os.$context<RpcContext>()`.
- Procedures defined in `procedures/`, composed into a router object in `router.ts`.
- Router is a nested object: `{ echo: procedure, health: { check: procedure } }`.
- Zod for input validation in procedures.

## Environment variables

- **`@t3-oss/env-core`** with Zod schemas.
- `clientPrefix: "PUBLIC_"` — client-exposed vars must start with `PUBLIC_`.
- Vite `envPrefix: "PUBLIC_"`.
- `emptyStringAsUndefined: true`.
- `runtimeEnv`: `process.env` on server, `import.meta.env` in browser.
- Config objects validated with `satisfies ConfigType` pattern.

## App conventions (TanStack Start)

- Vite + TanStack Start + React + Tailwind.
- File-based routing (TanStack Router) — run `tsr generate` when adding routes.
- `aspen/` directory for framework config: `server.ts` (Platform.create), `auth.ts` (access_control + roles), `client.ts`.
- Config objects use `satisfies` against framework config types.
- Docker Compose for Postgres (`postgres:18-alpine`).

## Git hooks (Husky)

- **pre-commit**: `bunx lint-staged` → runs `biome check --fix --no-errors-on-unmatched` on staged files
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
| Unit lifecycle (server) | `$` prefix | `$name`, `$prepare`, `$cleanup` |
| Unit lifecycle (client) | no prefix | `name`, `prepare`, `destroy` |
| Package exports | `@aspen-os/<name>` | `@aspen-os/platform`, `@aspen-os/organization` |
| Module `name` property | `kebab-case` string | `"organization"`, `"compliance"` |

## Commands

```
bun install                                    # install all workspace deps
bun run check:lint                             # biome check --fix . (root)
bun run check:types                            # tsc -b (root tsconfig)
bun run update:deps                            # taze -rw --maturity-period 3
cd packages/framework && bun run check:types   # typecheck framework
cd packages/framework && bun run check:lint    # biome check --fix . (framework)
```

No build/test/format scripts at root or in platform. Testing exists only in `documentation` (`bun run test` = `vitest run`).

### Per-package typecheck

Always run `tsc -b` in the package whose path alias you mean — the `@/*` alias resolves differently per tsconfig.
