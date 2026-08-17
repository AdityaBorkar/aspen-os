# Skill: write-module

A **template** in the CODING_CONVENTIONS.md `packages/<module>/` skeleton. Every file you create follows the dms module's shape — flat `readonly` workflow groups composed in `workflows/index.ts` (a `#db` getter only when a workflow is bound to a unit at construction time, as management does for `tenants.onboard`), `utils/constants.ts` for enum constants, a `db-schemas/enums.ts` for `pgEnum`s, module-level `runtime.ts` singletons for config/units, and a `services/` layer for shared domain logic. Read the corresponding file in `packages/dms/src/` (e.g. `module.ts`, `db-schemas/file.ts`, `schemas/file.ts`, `workflows/file/upload.ts`, `workflows/index.ts`, `workflow-steps/fetch-file.ts`, `services/path-service.ts`) before writing each one, so your file matches the exact shape, not just the summary here. Walk the steps in order; each ends on a completion criterion that must be met before you move on.

## Step 1 — Name and scaffold

Pick `<name>` (kebab-case, singular). Create the stub package:

```
packages/<name>/
  package.json
  tsconfig.json
  docs/
    index.mdx
    meta.json
  src/
    index.ts
    types.ts
    runtime.ts            # optional — only when workflows/services need config or a unit ref outside ctx
    pubsub.ts
    auth.ts
    utils/
      constants.ts
      strip-undefined.ts
    db-schemas/
      index.ts
      enums.ts
      <entity>.ts
    schemas/
      index.ts
      enums.ts
      utils.ts
      <entity>.ts
    services/             # optional — when multiple workflows share domain logic
      <entity>-service.ts
    workflow-steps/
      fetch-<entity>.ts
    workflows/
      index.ts
      services.ts         # optional — only when exposing service functions as proxy groups
      <entity>/
        <verb>.ts
        <subresource>/
          <verb>.ts
```

The `workflows/` tree uses REST-style folders: `workflows/<entity>/<verb>.ts` for CRUD (`file/get.ts`), `workflows/<entity>/<subresource>/<verb>.ts` for subresource actions (`class/field/add.ts` for `class.add-field`), and `workflows/<entity>/by-<qualifier>/<verb>.ts` for scoped queries (`label/by-label/list.ts`). Reusable `WorkflowStep`s live in `src/workflow-steps/`, not inside `workflows/`.

**package.json** — mirror dms's shape:

```json
{
  "build": {
    "exports": { ".": { "path": "./src/index.ts", "target": "node" } },
    "files": ["./docs", "package.json", "README.md"]
  },
  "dependencies": {
    "@aspen-os/constants": "workspace:*",
    "@aspen-os/platform": "workspace:*",
    "drizzle-kit": "^0.31.10",
    "drizzle-orm": "catalog:",
    "pg": "^8.23.0",
    "valibot": "catalog:"
  },
  "devDependencies": {
    "@types/bun": "catalog:",
    "@types/pg": "^8.21.0",
    "typescript": "catalog:"
  },
  "exports": {
    ".": { "default": "./.output/index.js", "types": "./.output/index.d.ts" }
  },
  "files": ["./docs", "package.json", "README.md", "./.output"],
  "name": "@aspen-os/<name>",
  "scripts": {
    "build": "bun run ../../scripts/build.ts",
    "check:lint": "oxlint --fix . ; oxfmt .",
    "check:types": "tsc -b"
  },
  "type": "module",
  "version": "0.1.0"
}
```

**tsconfig.json** — extend root, mirrored from dms:

```json
{
  "compilerOptions": {
    "declarationDir": "../../.local/types/<name>",
    "paths": { "#/*": ["./src/*"] }
  },
  "extends": "../../tsconfig.json"
}
```

**docs/index.mdx** — stub with module name (dms's is a full intro with `Cards`; start minimal):

```mdx
---
title: <PascalName>
description: <1-line description>
icon: Icon<Icon>
---

Module not yet implemented.
```

**docs/meta.json** — mirrored from dms:

```json
{
  "icon": "Icon<Icon>",
  "pages": ["overview", "workflows", "access-control", "events", "db-schemas"],
  "pagesIndex": "index",
  "root": true,
  "title": "<PascalName>"
}
```

**Completion**: `packages/<name>/` exists with all scaffold files (plus the optional ones the module actually needs).

## Step 2 — Add to root registrations

Two edits in `/home/aditya/projects/aspen-os/`:

1. **`tsconfig.json`** — add `{ "path": "./packages/<name>" }` to `references`.
2. **`docs/source.config.ts`** — add a `defineDocs({ dir: '../packages/<name>/docs', docs })` export, named after the module.

## Step 3 — Constants and enums

**`src/utils/constants.ts`** — `as const` objects for every enum plus audit/domain literals. Lowercase string values, `UPPER_SNAKE` keys. Each derives its type:

```ts
export const ENTITY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];
```

Beyond per-entity status enums, dms keeps `AUDIT_ACTION`, `AUDIT_ENTITY_TYPE` (`"dms:file"`-style), `SETTING_KEYS`, and `SCHEDULED_JOBS` (`"dms:auto-purge"`-style, used as pubsub cron topics) here — add whichever your module needs.

**`src/schemas/enums.ts`** — valibot `picklist` schemas that mirror constants, importing from `../utils/constants` and re-exporting the constants objects:

```ts
import { picklist } from "valibot";
import { ENTITY_STATUS } from "../utils/constants";
export const EntityStatusSchema = picklist(Object.values(ENTITY_STATUS));
export { ENTITY_STATUS } from "../utils/constants";
```

**`src/utils/strip-undefined.ts`** — copy verbatim from dms's `utils/strip-undefined.ts`.

## Step 4 — DB schemas

**`src/db-schemas/enums.ts`** — one `pgEnum` per shared enum, named `<name>_<snake_case>`, values referencing the constant objects:

```ts
import { pgEnum } from "drizzle-orm/pg-core";
import { FILE_STATUS } from "../utils/constants";
export const dmsFileStatusEnum = pgEnum("dms_file_status", [
  FILE_STATUS.TRIAGED,
  FILE_STATUS.ACTIVE,
  ...
]);
```

**`src/db-schemas/<entity>.ts`** — one file per table. Conventions from AGENTS.md:

- `pgTable("snake_case_name", { … }, (t) => [indexes])`
- `id: uuidv7("id").primaryKey()` — `import { uuidv7 } from "@aspen-os/platform/server"` (do **not** use `sql\`uuidv7()\``) (exception: better-auth tables use plain `text("id").primaryKey()`) — the `uuidv7`column type bakes in the insert-time JS`generateUuidv7()` default
- `createdAt` / `updatedAt` with timestamptz, `notNull().defaultNow()`, `$onUpdate(() => new Date())` on updatedAt only
- Columns sorted alphabetically by TS property name
- `pgEnum` from `./enums`, `date("expiry_date")` for plain dates, `bigint("size", { mode: "number" })` for sizes, `jsonb` for metadata
- Export types: `type <Entity> = typeof pgTable.$inferSelect` and `type New<Entity> = typeof pgTable.$inferInsert`

**`src/db-schemas/index.ts`** — re-export every table const + enum, then build a named `<name>Tables` aggregate and the schema maps:

```ts
export { dmsFile } from "./file";
export { dmsFileStatusEnum } from "./enums";
// ...

import { dmsFile } from "./file";
// ...

export const dmsTables = { dmsFile, ... } as const;

export const control_plane_schemas = {} as const;
export const tenant_schemas = dmsTables;
```

## Step 5 — Valibot schemas

**`src/schemas/utils.ts`** — shared validators from dms: `IdSchema`, `NameSchema`, `FileNameSchema`, `EmailSchema`, `HexColorSchema`, `WithIdSchema` (plus dms's `FileIdSchema`/`WithFileIdSchema` — keep what your module needs).

**`src/schemas/<entity>.ts`** — per-entity schemas. Pattern (see `schemas/file.ts`, `schemas/share.ts`):

- `Create<Entity>Schema = object({ … })` with `optional(nullable(string()))` for optional DB fields, `optional(schema, "default")` for field-level defaults, `nullish` for nullable-and-optional
- `Update<Entity>Schema = object({ … })` with `optional(...)` for patch fields (no nullable — `undefined` = unchanged)
- `<Entity>FiltersSchema` / options schemas with `optional(pipe(number(), integer()))` for limit/offset — never bare `integer()`
- Types: `type Create<Entity>Input = InferOutput<typeof Create<Entity>Schema>` per schema
- Separate `export type {}` and `export {}` blocks per verbatimModuleSyntax

**`src/schemas/index.ts`** — re-export all schemas and types from `enums.ts`, `utils.ts`, and each `<entity>.ts`, with separate export-type blocks.

## Step 6 — Auth ACL

**`src/auth.ts`** — `defineAcl({ resource: ["create","delete","read","update"] })`. Each resource is a domain entity name in camelCase; include non-CRUD actions the module needs (dms's `file` adds `classify`, `download`, `restore`; `fileView` adds `set_default`).

## Step 7 — Events

**`src/pubsub.ts`** — one `<ENTITY>_EVENTS` constant object per entity group. Format: `"<name>:<event_name>"` (dms: `"dms:file_uploaded"`). Export the `events` object, typed event interfaces, per-entity `<Entity>EventMap`, and a module-level intersection type named `<PascalName>EventMap` (dms's is `DmsEventMap`), exactly as dms does.

## Step 8 — Workflows

**`src/workflows/<entity>/<verb>.ts`** — one file per workflow in REST-style folders: `workflows/<entity>/<verb>.ts` for CRUD verbs (`create`, `get`, `list`, `update`, `delete`), `workflows/<entity>/<subresource>/<verb>.ts` for nested actions (`class/field/add.ts` from `class.add-field`), and `workflows/<entity>/by-<qualifier>/<verb>.ts` for scoped queries (`label/by-label/list.ts`). Builder API (dms shape — module-prefixed name, `input`-wrapped schema, parse inside handler):

```ts
import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";
import { <Entity>Schema } from "../../types";

const CreateInputSchema = object({ input: Create<Entity>Schema });

export const create<Entity> = Workflow.name("<name>.<entity>.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    // 1. const parsed = parse(Create<Entity>Schema, input) — then guard (throw for business rules)
    // 2. Wrap every idempotent unit in ctx.step.run("step-name", async () => { ... })
    // 3. ctx.audit.write({ action, crudAction, entityId, entityType, newState, changes?, previousState?, metadata? })
    // 4. ctx.pubsub.publish(<ENTITY>_EVENTS.CREATED, payload)
    // 5. Return result (`.returning()` or ctx.step.run(fetch<Entity>Step, { id }))
  });
```

Workflow and step names are module-prefixed (`"dms.file.upload"`, `"dms-fetch-file"`). Workflow names use dots, step names use hyphens.

**`src/workflow-steps/fetch-<entity>.ts`** — reusable `WorkflowStep.name("<name>-fetch-<entity>")` for DB lookups. Throw on not-found.

**`src/workflows/index.ts`** — the single composition point. Import every workflow, then build per-entity `as const` groups and re-export any service groups:

```ts
import { createFile } from "./file/create";
// ...

export const files = {
  create: createFile,
  get: getFile,
  // ...
} as const;

export { access, archive, paths, storage } from "./services";
```

**`src/workflows/services.ts`** — only when non-workflow functions should be exposed on the proxy. Re-wrap service functions as `{ fn: (input) => fn(input) }` entries grouped `as const` (see dms's `access`/`archive`/`paths`/`storage`).

**Grouping**: compose per-entity named groups in `workflows/index.ts`; the module class references them as `readonly` properties. A group needs a **getter** (management's `get tenants()`) only when a workflow is bound to a unit at construction time (e.g. `createOnboardTenant(this.#db)`). Default to `readonly`; use a getter only when you actually inject a stored unit reference.

## Step 9 — Module class

**`src/index.ts`** — export the module class + config type + `export * from "./types"`, plus a `dbSchema` namespace (dms's index):

```ts
export { Dms, type DmsModuleConfig } from "./module";
export * from "./types";

import * as dbSchema from "./db-schemas";
export { dbSchema };
```

**`src/runtime.ts`** (optional) — module-level singletons for config and units that workflows/services read without `ctx` (dms: `setDmsConfig`/`getDmsConfig`, `setDmsStorage`/`getDmsStorage`). `get*` throws when unset; `set*` called from the module's constructor and `$initialize`.

**`src/types.ts`** — the re-export hub: DB row types, event interfaces, constants, valibot schemas/inputs, service result types, domain interfaces, and the config type. Separate `export type {}` / `export {}` blocks per source (`./db-schemas/*`, `./pubsub`, `./schemas`, `./utils/constants`, `./services/*`).

**`src/module.ts`** — implement `Module` following the dms pattern:

```ts
import type { AuthUnit, DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";
import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import * as wf from "./workflows";

const DEFAULT_CONFIG: Required<<PascalName>Config> = { ... };

export type { <PascalName>Config };

export class <PascalName> implements Module {
  static create(config?: <PascalName>Config): <PascalName> {
    return new <PascalName>(config ?? {});
  }

  readonly $name = "<name>";
  readonly $dependencies: readonly string[] = [];
  readonly $config: Required<<PascalName>Config>;

  #db: DatabaseUnit | null = null;

  constructor(config: <PascalName>Config) {
    this.$config = { ...DEFAULT_CONFIG, ...config };
    set<Name>Config(this.$config);
  }

  $prepareInfra(): ModuleInfra {
    return {
      auth: { acl },
      db: { control_plane_schemas, tenant_schemas },
      events,
    };
  }

  $initialize(units: { db: DatabaseUnit; auth: AuthUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
  }

  $prepareRuntime() {}
  $cleanup() {}

  readonly files = wf.files;
  readonly folders = wf.folders;
  // ...
}
```

Key differences from management's shape:

- `static create(config?)` takes an **optional** config and merges `DEFAULT_CONFIG` into a `Required<Config>` (config type lives in `types.ts`; `export type { Config }` re-exported from `module.ts`).
- `$initialize(units)` types **its own unit subset** — add `storage: StorageUnit` etc. only if your module needs it. Keep `#private` refs only for units used in `$prepareRuntime()`/`$cleanup()`; anything services need goes through `runtime.ts`.
- `$prepareRuntime()` / `$cleanup()` — only when the module wires scheduled jobs: register/unregister pubsub cron topics + handlers via `services/` functions (dms's `registerExpiryScanner`/`registerPurgeSchedule`). Otherwise leave them empty.
- Workflow groups are `readonly` properties delegated to `wf.*`; no getters unless a workflow binds a unit at construction.

## Step 10 — Doc pages

Create `docs/overview.mdx`, `docs/workflows.mdx`, `docs/access-control.mdx`, `docs/events.mdx`, `docs/db-schemas.mdx` mirroring dms's doc structure, and flesh out `docs/index.mdx` with `Cards` linking them. Each has frontmatter (`title`, `description`, `icon`) and content extracted from the source code. Follow `DOC-TYPES.md` from the `write-docs` skill for type-appropriate structure.

**Completion**: every public method, table, event, enum, and ACL resource accounted for in at least one doc page.

## Step 11 — Verify

Run in order:

```bash
cd /home/aditya/projects/aspen-os/packages/<name> && bun run check:types   # tsc -b must pass
cd /home/aditya/projects/aspen-os/packages/<name> && bun run check:lint    # oxlint --fix . ; oxfmt . must pass
cd /home/aditya/projects/aspen-os/packages/<name> && bun run build         # writes .output/ + rewrites exports (matches dms)
cd /home/aditya/projects/aspen-os && bun run check:types                   # root composite — your package must pass
```

If `check:types` reports errors about the module's own types, rebuild `@aspen-os/platform` first (`cd packages/platform && bun run build` — it publishes to `.output/`, and `tsc` resolves from there) and re-run the package typecheck. Root composite failures in other packages (`tasks`, `compliance`, `hr`, etc.) are pre-existing and not caused by your new module — verify by checking whether your package's errors appear. After `bun run build`, `git status` shows the package's `package.json` modified (exports re-pointed at `.output/`); `bun run build --dev` rewrites them back to `./src/*` without emitting.

**Completion**: all three package-level checks pass, `.output/` is built, and the root composite typechecks.
