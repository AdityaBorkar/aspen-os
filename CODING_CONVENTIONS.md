# Coding Conventions

Exhaustive code-facts reference. `AGENTS.md` is the lean pointer; detail lives here. Every rule below matches code — grep-verified.

Task routing: write a new module → `.agents/skills/write-module/SKILL.md` + §3 Module shape; add/change table or column → §3 Database; add/change validation → §3 Validation; add/change event or workflow → §3 Events/Workflows; add/change ACL or auth → §3 Auth; understand platform lifecycle or units → §3 Module shape; name anything → §3 Naming summary; build/typecheck/verify → §3 Build/ops.

## Section 1 — Tech stack

Runtime: Bun (not Node.js). Language: TypeScript, ESM only (`"type": "module"` in every package and root). Package manager: Bun workspaces (`bun install`); binary lockfile `bun.lockb`.

Workspace layout: `packages/*`, `examples/*`, `docs`. `examples/*` contains only `examples/recruiter/seaweedfs-s3.json` (SeaweedFS/S3 config stub, no `package.json`); there is no host/example application. `docs` is the Fumadocs site; domain source of truth is `.working-docs/` (drafts in `.draft/`).

Build-step packages (have `build` script `bun run ../../scripts/build.ts` → `.output/`): `platform`, `organization`, `masters`, `notes`, `calendar`, `management`, `comms`, `dms`, `workspace`, `constants`. All except `constants` rewrite `exports`/`bin` to `.output/` on build; `constants` keeps `exports` at `./src/index.ts` and only emits declarations to `.output/`. Raw-src packages (no build, export raw `src`): `compliance`, `tasks`, `hr-core`, `hr-attendance`, `hr-leave`. Stub packages (`crm`, `fleet`, `inventory`, `reports`): `package.json` holds only `name`; `src/index.ts` is empty; `docs/` holds stub `index.mdx`/`meta.json`/`overview.mdx`.

Workspace catalog (`package.json` `workspaces.catalog`): `@standard-schema/spec`, `@standard-schema/utils`, `@types/bun`, `bun`, `drizzle-kit`, `drizzle-orm`, `typescript`, `valibot`, `fflate`, `@aws-sdk/client-ses`. Packages reference shared versions via `catalog:`.

Workspace inter-package dependencies use `workspace:*` (`@aspen-os/platform`, `@aspen-os/constants`, `@aspen-os/masters`, etc.). Infra deps are pinned with caret ranges: `pg`, `pg-boss`, `better-auth` + `@better-auth/api-key`/`@better-auth/passkey`, `@aws-sdk/client-s3`, `pino`, `@orpc/server`, `drizzle-orm`, `valibot`, `zod`. No package declares `packageManager`; `bun` itself is only a catalog dep of `@aspen-os/platform`.

Config files and effective settings:

- `tsconfig.json` (root, extended by packages): `strict: true`, `noUncheckedIndexedAccess: true`, `noUncheckedSideEffectImports: true`, `verbatimModuleSyntax: true`, `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ESNext"`, `lib: ["ESNext"]`, `moduleDetection: "force"`, `jsx: "react-jsx"`, `composite: true`, `declaration: true`, `declarationMap: true`, `emitDeclarationOnly: true`, `declarationDir: "./.local/types/root"`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noUnusedLocals: true`, `noUnusedParameters: false`, `noPropertyAccessFromIndexSignature: false`, `skipLibCheck: true`, `types: ["bun","@types/bun"]`, `allowJs: true`; excludes `**/node_modules`, `**/.output`, `**/.tanstack`, `tools/**`; project references to all workspace packages + `docs`. Root has no `paths` mapping; each package maps `#/*` → `./src/*` locally.
- `bunfig.toml`: `telemetry = false`, `logLevel = "warn"`, `[console] depth = 10`, `[run] bun = true, silent = false`, `[install] ignore-scripts = true, minimumReleaseAge = 259200 (3 days), saveTextLockfile = false`.
- `.oxlintrc.json`: `ignorePatterns: [".agents/**","tools/**"]`, `jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }]`, `options: { typeAware: true, typeCheck: true }`, `env: { browser:true, es2022:true, node:true }`, `categories: { correctness:"error", perf:"warn", style:"warn", suspicious:"warn" }`, `plugins: ["import","jsdoc","jsx-a11y","node","promise","react","react-perf","typescript","oxc","unicorn"]`, `globals: { Bun:"readonly" }`.
- `.oxfmtrc.json`: `sortImports` with `customGroups` for `https://**`/`http://**` (`url`) and `bun:*`/`npm:*`/`deno:*`/`jsr:*` (`protocol`); groups `[url,[builtin,protocol,subpath],external,[internal,parent,sibling,index,style],unknown]`; Tailwind class sorting enabled via `clsx`, `cva`, `tw`, `cn`; no explicit generated-directory skip list.
- `.gitignore`: `node_modules`, `.output`, `.build`, `.tanstack`, `.source`, `.wrangler`, `.nitro`, `.local`, `.cache`, `.nx/cache`, `.nx/migrate-runs`, `.nx/polygraph`, `.nx/workspace-data`, `*.tsbuildinfo`, `.DS_Store`, `*.gen.ts`, `worker-configuration.d.ts`, `codedb.snapshot`, `.env*` (except `.env.example`).
- `scripts/build.ts`: deletes and recreates `.output/`; rewrites `package.json` `exports`/`bin` to `.output/` paths (except `constants`); `--dev` rewrites `exports`/`bin` back to `./src/*` without emitting; emits ESM `format:"esm"` via `bun build`, generates declarations with `tsc -p tsconfig.build.json`, rewrites `#/*` aliases in `.d.ts` to relative paths, fixes `import(nodeSqlite)` with `/* @vite-ignore */`.
- `nx.json`: `parallel:1`, `targetDefaults.build: { dependsOn:["^build"], outputs:["{projectRoot}/.output"], cache:true }`, `check:lint: { dependsOn:["^check:lint"], cache:true }`, `check:types: { dependsOn:["^check:types","^build"], cache:true }`.
- `package.json` scripts: `check:lint: "oxlint --fix . ; oxfmt ."`, `check:types: "tsc -b"`, `build: "nx run-many -t build --exclude=docs --no-tui"`, `clean: "bunx rimraf --glob \"**/{node_modules,.nx,.output,.local,bun.lockb}\""`, `prepare: "husky"`, `update-deps: "taze -rw --maturity-period 3 && bun install"`.

`@aspen-os/platform` exports (built): `./server` → `.output/server/index.js`, `./client` → `.output/client/index.js`, `./server/db-schemas` → `.output/server/db/schema/index.js`; `bin.aspen` → `.output/cli/index.js`; source paths under `build.exports` are `./src/client/index.ts` (`browser`), `./src/server/index.ts` (`node`), `./src/server/db/schema/index.ts` (`node`).

## Section 2 — Tool-enforced rules (TypeScript, lint, format)

Break any rule below and `check:types` or `check:lint` fails. The cited tool is the enforcer; no manual prohibition phrasing needed here.

**tsconfig-enforced (`check:types` → `tsc -b`):**

- `strict: true` — enforce strict type checking; violation fails `check:types` via `tsc`.
- `noUncheckedIndexedAccess: true` — enforce indexed access may be `undefined`; violation fails `check:types`.
- `noUncheckedSideEffectImports: true` — enforce side-effect imports are checked; violation fails `check:types`.
- `verbatimModuleSyntax: true` — enforce `import type` for type-only imports; use `import type { Foo }` never `import { Foo }` for types, enforced by `check:types`.
- `noFallthroughCasesInSwitch: true` — enforce exhaustive `switch` without fallthrough; violation fails `check:types`.
- `noImplicitOverride: true` — enforce explicit `override` keyword; violation fails `check:types`.
- `noUnusedLocals: true` — enforce no unused locals; violation fails `check:types` (note `noUnusedParameters: false` so unused parameters are allowed).
- `moduleResolution: "bundler"` + `module: "ESNext"` + `target: "ESNext"` — enforce ESM bundler resolution; violation fails `check:types`.

**oxlint-enforced (`check:lint` → `oxlint --fix .`):**

- `correctness: "error"` — correctness violations fail `check:lint` via `oxlint`.
- `typeAware: true` + `typeCheck: true` — enable type-aware linting; type errors fail `check:lint` via `oxlint`.
- `anti-slop` plugin (loaded from `./tools/oxlint/anti-slop/index.ts`) — all 14 rules are `error` and fail `check:lint`: `anti-slop/no-chained-type-assertions`, `anti-slop/no-conditional-empty-object-spread`, `anti-slop/no-known-value-widening`, `anti-slop/no-module-mocking`, `anti-slop/no-object-parameters`, `anti-slop/no-reflect-apply`, `anti-slop/no-reflect-get`, `anti-slop/no-runtime-typeof`, `anti-slop/no-shape-in-symbol-names`, `anti-slop/no-unknown-parameters`, `anti-slop/no-unknown-returns`, `anti-slop/no-unknown-type-aliases`, `anti-slop/no-unsafe-dictionary-type`, `anti-slop/no-widen-then-assert`, `anti-slop/require-safety-comment-for-type-assertion`.
- `eslint/no-warning-comments: "error"` — `TODO`/`FIXME` warning comments fail `check:lint` via `oxlint`.
- `eslint/no-useless-return: "error"`, `eslint/no-promise-executor-return: "error"`, `promise/no-return-in-finally: "error"` — violations fail `check:lint`.
- `import/no-cycle: "error"` — circular imports fail `check:lint` via `oxlint`.
- `unicorn/filename-case: "error"` — non-kebab-case filenames fail `check:lint` via `oxlint`.
- `react/self-closing-comp: "error"`, `react/button-has-type: "error"` — violations fail `check:lint`.

**oxfmt-enforced (`check:lint` → `oxfmt .`):**

- Import sorting — `oxfmt` sorts imports by groups `url` → `builtin/protocol/subpath` → `external` → `internal/parent/sibling/index/style` → `unknown`; violation is auto-fixed but `check:lint` mutates the file.
- Tailwind class sorting — `oxfmt` sorts Tailwind classes inside `clsx`, `cva`, `tw`, `cn` calls; violation is auto-fixed by `check:lint`.

**Other tool-enforced:**

- `husky` + `commitlint`: `commit-msg` runs `bunx commitlint --edit $1` against `@commitlint/config-conventional`; only types `build chore ci docs feat fix perf refactor revert test wip` pass, enforced at commit time.
- `lint-staged` + `oxfmt`: `pre-commit` runs `bunx lint-staged` → `oxfmt` on staged files (`"*": "oxfmt"`), enforced at commit time.

## Section 3 — Hand-enforced conventions

Every item below is an imperative or an explicit prohibition. Pair each prohibition with its replacement in the same sentence.

### Naming

- Use `kebab-case` for all filenames, never `camelCase` or `snake_case` for files; oxlint `unicorn/filename-case` enforces it but the convention is hand-documented for intent.
- Use `PascalCase` for classes, never `camelCase` for classes; use `DatabaseUnit`, `Dms`, `Compliance`, never `databaseUnit`.
- Use `UPPER_SNAKE_CASE` for constants and constant objects, never `camelCase` for constants; use `FILE_STATUS`, `ENTITY_EVENTS`, never `fileStatus`.
- Use `snake_case` for database tables and columns in both Postgres and TypeScript, never `camelCase` in DB code; write `owner_id: text().notNull()` never `ownerId: text("owner_id")`; the TS object key is the column name — never pass an explicit name string inside the column builder.
- Use `domain:event_name` for event topics, never `domainEventName` or `domain.event_name`; write `"dms:file_uploaded"` never `"dms.fileUploaded"`.
- Use `$` prefix for lifecycle methods and properties, never bare names; use `$name`, `$dependencies`, `$initialize`, `$prepareInfra`, `$prepareRuntime`, `$prepareTenant`, `$cleanup`, never `name`/`initialize`.
- Use `#` prefix for private fields, never `private` keyword or `_` prefix; use `#db`, `#pubsub`, `#expiryTopic`, never `private db` or `_db`.
- Use `@aspen-os/<name>` for package imports, never relative cross-package imports; use `import { Dms } from "@aspen-os/dms"` never `import { Dms } from "../../dms/src"`.
- Use `readonly $name = "kebab-case"` for module identity, never `PascalCase` or `snake_case` for `$name`; write `readonly $name = "dms"` never `readonly $name = "Dms"`.
- Keep the Naming summary table in sync when any naming convention changes.

### Database

- Use `id: uuidv7().primaryKey()` for all domain and platform core IDs, never native UUID columns; never use `uuid("id")`, `text("id")` with manual generation, or `sql\`uuidv7()\``.
- Never pass an explicit name to `uuidv7()` — use `uuidv7().primaryKey()`, never `uuidv7("id")`; the column helper infers the name from the object key.
- Use the exported `uuidv7` from `@aspen-os/platform/server` (backed by `generateUuidv7()` using `crypto.getRandomValues` and `timestamp` byte layout), never `sql\`uuidv7()\``or raw`crypto.randomUUID()`for domain IDs;`generateUuidv7()`stays available for non-column UUID strings, but workflow engine uses`crypto.randomUUID()`for`run_id`/`step_id`.
- Always use `timestamp({ withTimezone: true })` for domain/core timestamps, never timezone-less `timestamp()`; exception — generated better-auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `apikey`, `twoFactor`, `passkey`) use `timestamp()` without `withTimezone: true` because better-auth manages them.
- Use `.notNull().defaultNow()` for `created_at` in domain/core tables, never bare `timestamp()`; add `$onUpdate(() => new Date())` only where `updated_at` must auto-bump, never omit the trigger when update tracking is required.
- Use `date()` for date-only columns (e.g. `founded_date`, `expiry_date`), never `timestamp()` for dates; convert `Date` to date string via `.toISOString().split("T")[0]` in workflows where needed.
- Sort table columns alphabetically by `snake_case` key, never ad-hoc ordering; review diff for new tables.
- Use `pgEnum("snake_case_name", [...values])` for enums, never `pgEnum("CamelCase", ...)`; DMS enums carry `dms_` prefix (`dms_entity_type`, `dms_file_status`); reference constants objects for values (`pgEnum("compliance_category", [COMPLIANCE_CATEGORY.TAX, ...])`), never inline string literals.
- Use lowercase strings for enum values, never `UPPER_SNAKE` values; define constants as `as const` objects with `UPPER_SNAKE` keys mapping to lowercase values.
- Use `idx_<table>_<column>` for ordinary indexes and `idx_<table>_search` for GIN `to_tsvector` full-text indexes, never `index_<table>` or unnamed indexes; declare indexes in the table's third argument as `index()` array or object map; DMS adds GIN indexes over `to_tsvector('simple', name) || to_tsvector(...)` expressions.
- Use `jsonb()` with `.$type<...>()` for flexible metadata, never `text()` for JSON; use `.default({})` or `.default([])` where empty defaults are needed, never nullable JSON without thought.
- Use `numeric()` for monetary/decimal values, `integer()` for counts, `bigint({ mode: "number" })` for file sizes, `text().array().default([])` for string arrays, `boolean().notNull().default(false)` for booleans, never mismatched types.
- Never add explicit Drizzle foreign keys on domain tables — store related IDs as plain `text` without `.references()`; exception — generated better-auth tables use explicit `references(() => user.id, { onDelete: "cascade" })` after re-applying the snake_case codemod post-generation.
- Never write Drizzle `relations()`/`one()`/`many()` in domain schemas — domain schemas have none; only generated better-auth schema uses `relations()`.
- Never create migration files — use `pushSchema()` (`DatabaseUnit.$prepareInfra` / `prepareWithModules` / `pushSchemasToTenant`); `pushSchema` is currently commented to a no-op but the contract remains — do not add `drizzle-kit` migration scripts.
- Never create `Result<T, E>` or `PaginatedResult` types — use thrown errors and direct return values.
- Map at the DB boundary explicitly: Valibot schemas, event payloads, `AuditEntry`, and context (`ctx.actorId`, `ctx.tenantId`) stay `camelCase`, but inserts/updates use `snake_case` keys with camel values (`owner_id: input.ownerId`); row reads use `snake_case` (`created.owner_id`), event publishes map back (`ownerId`).

### Module shape

- Always implement the `Module` interface, never a bare class without `implements Module`; define `readonly $name`, `readonly $dependencies`, `$initialize`, `$prepareInfra`, `$prepareRuntime`, `$cleanup`, and optionally `$prepareTenant` for isolated-only modules.
- Use `static create(config)` factory, never `new Module()` directly; store `readonly $config` and apply defaults in the constructor (e.g. `DEFAULT_CONFIG` spread).
- Always declare `readonly $dependencies: readonly string[]` (type `[]` when empty), never omit the field; validation happens in `BasePlatform.createCore()` which throws if a listed dependency is missing; units (`db`, `pubsub`, etc.) must never be listed in `$dependencies` — they arrive via `$initialize(units)`.
- Use `readonly $consumes: readonly string[]` for optional peer event topics, never validate `$consumes` at creation time; use it as introspection-only (`compliance` consumes `hr:*`, `fleet:*`, `masters:*`; `dms` consumes `masters:contact_removed`; `calendar` consumes `task:*`); a missing producer silently no-ops.
- Follow the lifecycle order `Platform.create(config, modules)` → `$prepareInfra()` → `run(...)` → `$cleanup()`, never call `$prepareRuntime` or `run` before `$prepareInfra`; creation validates `$dependencies`, calls `mod.$initialize(units)`, returns a Proxy resolving unit keys before module `$name`; `$prepareInfra` merges schemas/ACL, pushes schemas, applies ACL, then runs `$prepareRuntime` inside `runInContext`.
- Always call `getContext()` inside `Platform.run()` or a `pubsub.wrapHandler` context, never outside; `getContext()` throws outside `AsyncLocalStorage` scope.
- Use ` $initialize(units)` to capture unit refs, never store full `units` map untyped; stateless modules (e.g. `organization`, `tasks`, `notes`) keep empty `$initialize`/`$prepareRuntime`/`$cleanup` and expose `readonly` workflow groups; runtime-wired modules (`compliance`, `calendar`, `dms`, `workspace`, `comms`, `hr-*`, `management`, `masters`) keep `#private` unit refs, register schedules/subscriptions in `async $prepareRuntime()` and unregister/null them in `$cleanup()`.
- Never forget to unregister schedules/subscriptions in `$cleanup()` — runtime-wired modules must implement `$cleanup()` that `unschedule`/`unsubscribe` every topic/schedule registered in `$prepareRuntime()`, using `Promise.allSettled` where appropriate.
- Use `Record<string, Unit>` with `isUnit(unit, "db")` type guards when injection shape varies, never unguarded casts; typed `{ db, auth, pubsub }` is allowed when the module's `$initialize` narrows to required units.
- Expose workflow groups as `readonly <entity> = <workflows>` properties, never getters for pure composition; use getters only when binding unit state (e.g. `management.tenants` creating `createX(this.#db)`, `masters.connections` binding `#kvStore`, `comms.channels` memoizing `db`/`kvStore`).
- Follow the file structure exactly, never deviate without updating this document:
  ```
  packages/<module>/
    docs/                 # Fumadocs source: index.mdx, overview.mdx, meta.json + domain pages
    src/
      index.ts            # re-exports from module.ts + types.ts
      module.ts           # class implements Module, static create, lifecycle, workflow groups
      auth.ts             # defineAcl({ ... }) (flat file, never utils/acl.ts)
      pubsub.ts           # Event constants + typed event interfaces + EventMap
      types.ts            # type re-exports from schemas + module config interfaces
      constants.ts        # as const enums — or utils/constants.ts (optional)
      runtime.ts          # module-scope runtime state (config, storage, view-resolver registry) — optional
      utils/strip-undefined.ts  # stripUndefined helper — optional
      db-schemas/
        index.ts          # exports control_plane_schemas + tenant_schemas
        enums.ts          # shared pgEnum defs referencing utils/constants
        <entity>.ts       # per-entity pgTable defs
      schemas/
        index.ts          # re-exports all schemas + types (separate export type / export blocks)
        enums.ts          # Valibot enum schemas mirroring constants
        utils.ts          # shared valibot validators (NameSchema, SlugSchema, etc.)
        <entity>.ts       # per-entity valibot schemas
      workflows/
        <entity>/<verb>.ts            # Workflow definitions (usually one action per file)
        <entity>/<subresource>/<verb>.ts
        index.ts                      # module-internal workflow router
        utils.ts                      # shared workflow helpers — optional
      workflow-steps/     # reusable WorkflowStep consts (e.g. fetch-<entity>.ts) — optional
      services/           # cross-cutting services — optional
  ```
- Never use barrel files except module-internal workflow aggregates (`workflows/index.ts` routers); platform has no root export — import via `@aspen-os/platform/server`, `@aspen-os/platform/client`, `@aspen-os/platform/server/db-schemas`, never `@aspen-os/platform`.
- Never use a package's `#/*` alias from another package — each `tsconfig.json` maps `#/*` to its own `./src/*`; root `tsconfig.json` has no `paths`, so cross-package `#/` fails `check:types`; run `tsc -b` in the package whose alias you mean.
- Keep the platform's eight required units in mind: `db` (`DatabaseUnit`), `auth` (`AuthUnit`), `audit` (`AuditUnit`), `logs` (`LogUnit`), `pubsub` (`PubSubUnit`), `storage` (`StorageUnit`), `rpc` (`RpcUnit`), `kvStore` (`KvStoreUnit`); `PlatformUnits<S>` accessors are `audit, auth, db, kvStore, logs, pubsub, rpc, storage`; `platform.getUnit("name")` and `platform.getModule("name")` are the typed accessors; `platform.$name` proxy exposes module names before unit names.
- Use mode-specific non-overloaded `run()` signatures, never an overloaded `run()`; `SingleTenantPlatform.run(fn)`, `SharedTenantPlatform.run(tenantId, fn)`, `IsolatedTenantPlatform.run(tenantId, fn)` are distinct; shared mode uses RLS transaction (`SELECT set_config('app.tenant_id', ...)` + `SET LOCAL ROLE tenant_role`), isolated mode uses `TenantResolver` DB-per-tenant, `isGlobalTenantId("$global")` routes to control-plane DB; do not add an overloaded `run()`.

### Validation

- Use Valibot for all domain input validation, never Zod for domain schemas; define schemas as `Create<Entity>Schema`, `Update<Entity>Schema`, `<Entity>FiltersSchema` and types via `InferOutput<typeof Schema>`; co-export in separate `export type {}` / `export {}` blocks for `verbatimModuleSyntax`.
- Use `Workflow.input(schema)` Standard Schema validation before handlers, never manual parsing inside handlers without `parse(Schema, input)`; handlers may call `parse` for narrowed or extra checks.
- Place shared validators in `schemas/utils.ts` (`NameSchema`, `SlugSchema`, `CountryCodeSchema`, `EmailSchema`, etc.), never duplicate regex/length logic.
- Use Zod only for oRPC procedure inputs and environment variables, never for domain workflows or DB schemas; current RPC source has no Zod input schemas (only `base.handler(async () => ...)` for `echo` and `health.check`); docs may show `z.object` examples but source pattern is Valibot; do not introduce new Zod-based domain validation without checking this document.

### Events

- Use `export const ENTITY_EVENTS = { CREATED: "domain:entity_created", ... } as const` with `UPPER_SNAKE` keys and `"domain:event_name"` lowercase snake_case values, never `camelCase` keys or `UPPER_SNAKE` values; pair with typed interfaces per event.
- Use `export type DomainEventMap = EntityEventMap & OtherEventMap` composed by intersection, never a single flat map; each `EventMap` maps `[ENTITY_EVENTS.X]` to its interface.
- Pass `events = { ENTITY_EVENTS, ... }` through `ModuleInfra.events` as a type-level contract only; the platform has no runtime event side effects, never rely on `ModuleInfra.events` for publishing.
- Publish via `ctx.pubsub.publish(EVENTS.X, payload)` (or `ctx.workflow.pubsub`), never direct `pg-boss` calls; map snake DB rows back to camel payloads at publish boundaries.

### Workflows

- Use `Workflow.name("domain.action").input(Schema).handler(fn)` to define durable workflows, never factory-less handlers; reuse steps via `WorkflowStep.name("step").handler(fn)` or `WorkflowStep.name("step").input(Schema).handler(fn)`.
- Use `ctx.step.run(step, input, { retries })` or `ctx.step.run("name", fn, { retries })` plus `ctx.step.sleep(ms)`, never raw `await fn()` without step tracking; `ctx.step.run` is idempotent/durable — completed `workflow_steps` replay from cache, retries up to `options.retries`.
- Keep one workflow action per file under REST-style folders `workflows/<entity>/<verb>.ts` (nested subresources like `class/field/add.ts`; scoped queries use `by-<qualifier>/`, e.g. `comment/by-task/list.ts`), never multiple unrelated actions per file (some historical files have multiple exports but new code must follow one-per-file); compose public groups in `module.ts` as `readonly <entity> = { create: createEntity, ... }` via `workflows/index.ts` router.
- Always handle `WorkflowContext = { actorId?, audit, auth?, config, db, pubsub, runId, step }` and `RunOptions = { actorId?, audit?, auth?, config?, db?, pubsub? }` that overrides `getContext()` defaults; validate business rules before DB ops, use `insert(...).values(...).returning()` for mutations where rows are needed, use `?? null` for optional fields, never `?? undefined` when DB expects `null`.
- Know persisted tables `workflow_runs` (`status: running|completed|failed`) and `workflow_steps` (`status: pending|running|completed|failed|skipped`); `id`s are `uuidv7()` defaults but engine supplies `crypto.randomUUID()`; errors serialize via `SerializedError` with `attempts`, `cause` chain, `stack`.

### Auth

- Use `defineAcl({ resource: ["create","read","update","delete", ...] })` in flat `src/auth.ts`, never `utils/acl.ts` or inline ACL; `defineAcl` is an identity fn with `const` generic for literal inference (`AclDeclaration = Record<string, readonly string[]>`); the platform merges all module ACLs concatenating unique actions per resource and calls `AuthUnit.applyModuleAcl(mergedAcl)` which recreates better-auth with `admin({ ac: createAccessControl(acl) })`, never `admin({})` alone at runtime.
- Always define `auth` as control-plane only — `AuthUnit` binds `db.controlPlaneDb` via `drizzleAdapter(db, { camelCase:false, provider:"pg", usePlural:false, transaction:true })`, never tenant DB.
- Use `text("role")` on `user` for roles, never a separate role table; better-auth plugins are `admin`, `username`, `organization`, `phoneNumber`, `emailOTP`, `apiKey`, `twoFactor`, `passkey` (with commented `LastLoginMethod`); client adds `LastLoginMethodClient` + `CaptchaClient`.
- Never hand-edit `packages/platform/src/server/db/schema/auth.ts` — regenerate via `bun run gen:auth-schema` (`bunx auth generate --config ./src/server/auth/~config.ts --output ./src/server/db/schema/auth.ts`) and re-apply the snake_case codemod; that file is the 10-table generated better-auth schema (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, `apikey`, `twoFactor`, `passkey`).
- Use `remove` in the auth REST API, never `delete`; the surface is `user.{create,get,remove,role.assign,role.unassign,update}`, `session.{create,invalidate,validate}`, `role.{list,remove}`, `otp.get`.

### PubSub

- Never call `pubsub.$prepareInfra()` expecting eager start — the single control-plane `pg-boss` is lazily started on first `publish`/`subscribe`/`schedule`, not during `$prepareInfra()`; `publish` without a prior `subscribe` (`boss.work(topic)`) silently drops — `send()` returns `null` and no queue row is inserted, never assume fire-and-forget works without a consumer.
- Always ensure every produced topic has a subscriber; `PubSubUnit.getUnsubscribedProducedTopics()` tracks produced topics lacking `subscriptions.has(topic)`; `BasePlatform.healthCheck()` probes `SELECT 1` + `getQueueSize` and marks `unhealthy` when unsubscribed produced topics exist.
- Use `publish(topic, data, options?)`, `publishBatch(topic, messages)`, `subscribe(topic, handler)`, `unsubscribe(topic)`, `schedule({ topic, cron, data?, options? })`, `unschedule(topic)`, `getSchedules()`, `purgeQueue(topic)` via `PubSubUnit`, never raw `pg-boss` APIs elsewhere; handlers run inside `context.run({ audit, auth, db, log, pubsub, tenantId })` with isolated-tenant DB resolution when `tenancyMode==="isolated"` and `tenantId` is non-global.
- Always register schedules and subscriptions in `$prepareRuntime()` and unregister in `$cleanup()`, never in `$initialize` or constructors; calendar uses `calendar:reminder-scan` cron + task bridge (`task:due_date_changed`, `task:deleted`, `task:status_changed`); dms uses `dms:expiry-scan` and `dms:purge` plus `masters:contact_removed` bridge; compliance uses obligation-generator plus event-bridge topics; comms uses `comms:message-sweeper` outbox cron + 8 event-bridge subscriptions; workspace uses per-schedule `workspace:schedule:<id>` crons; hr uses daily `attendance-sync` + `leave-accrual` schedules.

### Build/ops

- Always build build-step packages before typechecking raw-src consumers, never typecheck `compliance`/`tasks`/`hr` fresh without rebuilding `platform`; `scripts/build.ts` rewrites `exports`/`bin` to `.output/` in place (`git status` shows `package.json` modified); `bun run build --dev` rewrites `exports`/`bin` back to `./src/*` without emitting; fresh clone or `bun run clean` wipes `.output/` — never commit `.output/`.
- Use `bun install` to install, never `npm install`; `bunfig.toml` sets `ignore-scripts=true` so postinstall hooks never run on install.
- Use `bun run check:lint` (mutating `oxlint --fix . ; oxfmt .`) and `bun run check:types` (`tsc -b` composite) for verification, never bare `tsc` without `-b`; run focused checks via `cd packages/<name> && bun run check:lint` or `bun run check:types`; `nx.json` makes `check:types` depend on `^build`, so `nx run-many -t check:types` builds dependents first.
- Use `bunx fumadocs-mdx` when `docs/.source/` is missing, never assume install generated it (`ignore-scripts=true` blocks it); docs commands run from `docs`: `bun run dev` (port 3005), `check:types` (`fumadocs-mdx && tsc --noEmit`), `build` (`bun gen:cf-types && vite build`), `deploy` (`wrangler deploy`).
- Use `bun run clean` sparingly — it deletes `bun.lockb` plus `node_modules/.nx/.output/.local`, never use it when only needing to rebuild; use `bun run build` per package to rewrite exports.
- Never provide external PostgreSQL via checked-in compose — no compose file exists; tests and runs need externally provided Postgres; S3 via SeaweedFS stub `examples/recruiter/seaweedfs-s3.json` is the only infra hint.
- Never commit files violating `.oxlintrc.json` or `tsconfig.json` rules — `check:lint` and `check:types` are the gates; maintained custom test suite is `cd tools/oxlint/anti-slop && bun test`; no package test scripts or CI workflows exist.

### Negative rules summary

Pair each prohibition with its replacement:

- Never use native UUID columns — use `id: uuidv7().primaryKey()`.
- Never use `sql\`uuidv7()\``or`crypto.randomUUID()`for domain IDs — use the exported`uuidv7` helper.
- Never pass `uuidv7("id")` with explicit name — use `uuidv7().primaryKey()` and let the key infer the column name.
- Never repeat column name inside datatype params — write `owner_id: text().notNull()`, never `ownerId: text("owner_id")`.
- Never use migration files — use `pushSchema()` via `DatabaseUnit`.
- Never create `Result<T, E>` / `PaginatedResult` types — throw errors and return values directly.
- Never add barrel files except `workflows/index.ts` routers — import via direct paths.
- Never use `delete` in the auth REST API — use `remove`.
- Never recreate a `drive` package or parallel file/tag/share/trash model — `@aspen-os/dms` is the single document/file surface (`dms_file`, `dms_folder`, `dms_share`, `dms_label`, `dms_share`, `dms_setting`, `dms_legal_hold`, `dms_access_log`, `dms_file_version`, `dms_class`, `dms_class_field`, `dms_entity_label`, `dms_public_link`).
- Never recreate a `notifications` package or a parallel `comms:deliver` topic — `@aspen-os/comms` is the single notification/inbox surface; delivery is the cron-scan `comms:message-sweeper` outbox worker, never a direct publish.
- Never add a second `task_reminder` surface — `@aspen-os/calendar` owns the single reminder surface (`calendar_reminder`); `@aspen-os/tasks` publishes `task:*` events consumed by calendar's task bridge, never direct cross-module calls.
- Never own `master_note` or duplicate notes — `@aspen-os/notes` owns notes (`notes_note`).
- Never add an overloaded `run()` signature — use `SingleTenantPlatform.run(fn)`, `SharedTenantPlatform.run(tenantId, fn)`, `IsolatedTenantPlatform.run(tenantId, fn)`.
- Never use Zod for domain input validation — use Valibot; Zod stays for oRPC procedures and `docs/source.config.ts` only.
- Never use a package's `#/*` alias from another package — root has no `paths`, each package maps locally.
- Never call `wrapHandler` or `publish` outside `Platform.run()` context — `getContext()` must have a store.

### Naming summary

| Scope                    | Convention             | Example                                                                                              |
| ------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Files                    | `kebab-case`           | `auth.ts`, `pubsub.ts`, `db-schemas/file.ts`                                                         |
| Classes                  | `PascalCase`           | `DatabaseUnit`, `Dms`, `WorkflowEngine`                                                              |
| Constants / enum objects | `UPPER_SNAKE_CASE`     | `FILE_STATUS`, `COMPLIANCE_CATEGORY`                                                                 |
| DB tables                | `snake_case`           | `dms_file`, `kv_store`, `workflow_runs`                                                              |
| DB columns (TS = DB)     | `snake_case`           | `created_at: timestamp({ withTimezone:true })`, `owner_id: text()`                                   |
| Event topics             | `domain:event_name`    | `dms:file_uploaded`, `task:due_date_changed`, `calendar:reminder_due`                                |
| Private fields           | `#` prefix             | `#db`, `#pubsub`, `#topics`                                                                          |
| Unit/module lifecycle    | `$` prefix             | `$name`, `$dependencies`, `$initialize`, `$prepareInfra`, `$prepareRuntime`, `$cleanup`, `$consumes` |
| Package exports          | `@aspen-os/<name>`     | `@aspen-os/platform`, `@aspen-os/dms`, `@aspen-os/constants`                                         |
| Module `$name`           | `kebab-case` string    | `"dms"`, `"compliance"`, `"hr-core"`                                                                 |
| Indexes                  | `idx_<table>_<column>` | `idx_dms_file_folder`, `idx_task_project`, `idx_audit_log_entity_seq`                                |
| GIN search indexes       | `idx_<table>_search`   | `idx_dms_file_search`                                                                                |

### Maintenance

- When a rule starts being enforced by `oxlint`/`oxfmt`/`tsc`, move it from §3 to §2; when a check stops enforcing, move it down to §3.
- Keep `AGENTS.md` as the pointer and this file as the exhaustive home; never create a third copy of a convention.
- Keep the Naming summary and this section in sync when any naming rule changes.
