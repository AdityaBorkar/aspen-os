---
name: write-module
description: Scaffold a new `@aspen-os/{name}` domain module from scratch — package structure, module class, db schemas, valibot schemas, ACL, events, workflows, docs, and root registration.
disable-model-invocation: true
---

A **template** in the CODING_CONVENTIONS.md `packages/<module>/` skeleton. Every file you create follows the management module's shape — hybrid `$initialize({ db, auth, pubsub })` pattern with `#private` stored references for getters that need them, flat `readonly` properties for stateless workflow groups. Read the corresponding file in `packages/management/src/` (e.g. `module.ts`, `db-schemas/service-provider.ts`, `schemas/service-provider.ts`, `workflows/sp.create.ts`) before writing each one, so your file matches the exact shape, not just the summary here. Walk the steps in order; each ends on a file listing that must exist before you move on.

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
    pubsub.ts
    constants.ts
    auth.ts
    db-schemas/
      index.ts
    schemas/
      index.ts
      enums.ts
      utils.ts
    workflows/
      steps/
    utils/
      strip-undefined.ts
```

**package.json** — mirror management's shape:

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

**tsconfig.json** — extend root, mirrored from management:

```json
{
  "compilerOptions": {
    "declarationDir": "../../.local/types/<name>",
    "paths": { "@/*": ["./src/*"] }
  },
  "extends": "../../tsconfig.json"
}
```

**docs/index.mdx** — stub with module name:

```mdx
---
title: <PascalName>
description: <1-line description>
icon: Icon<Icon>
---

Module not yet implemented.
```

**docs/meta.json** — mirrored from management:

```json
{
  "icon": "Icon<Icon>",
  "pages": ["overview", "workflows", "access-control", "events", "db-schemas"],
  "pagesIndex": "index",
  "root": true,
  "title": "<PascalName>"
}
```

**Completion**: `packages/<name>/` exists with all scaffold files.

## Step 2 — Add to root registrations

Two edits in `/home/aditya/projects/aspen-os/`:

1. **`tsconfig.json`** — add `{ "path": "./packages/<name>" }` to `references`.
2. **`docs/source.config.ts`** — add a `defineDocs({ dir: '../packages/<name>/docs', docs })` export, named after the module.

## Step 3 — Constants and enums

**`src/constants.ts`** — `as const` objects for every status enum. Lowercase string values, `UPPER_SNAKE` keys. Each derives its type:

```ts
export const ENTITY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];
```

**`src/schemas/enums.ts`** — valibot `picklist` schemas that mirror constants:

```ts
import { picklist } from "valibot";
import { ENTITY_STATUS } from "../constants";
export const EntityStatusSchema = picklist(Object.values(ENTITY_STATUS));
export { ENTITY_STATUS } from "../constants";
```

Re-export the constants object (agents in the wild would add it to `types.ts`; that pattern is already documented in Step 9).

**`src/utils/strip-undefined.ts`** — copy verbatim from management's `utils/strip-undefined.ts`.

## Step 4 — DB schemas

**`src/db-schemas/<entity>.ts`** — one file per table. Conventions from AGENTS.md:

- `pgTable("snake_case_name", { … }, (t) => [indexes])`
- `id: text("id").primaryKey().$defaultFn(uuidv7)` — `import { uuidv7 } from "@aspen-os/platform/server"` (do **not** use `sql\`uuidv7()\``) (exception: better-auth tables use plain `text("id").primaryKey()`)
- `createdAt` / `updatedAt` with timestamptz, `notNull().defaultNow()`, `$onUpdate(() => new Date())` on updatedAt only
- Columns sorted alphabetically by TS property name
- `pgEnum` values reference constant objects
- Export types: `type Entity = typeof pgTable.$inferSelect` and `type NewEntity = typeof pgTable.$inferInsert`

**`src/db-schemas/index.ts`** — import and re-export. Build `control_plane_schemas` and `tenant_schemas` aggregates:

```ts
import * as entity from "./<entity>";
export { entity, entityEnum } from "./<entity>";
export const control_plane_schemas = { ...entity } as const;
export const tenant_schemas = {} as const;
```

## Step 5 — Valibot schemas

**`src/schemas/utils.ts`** — shared validators from management: `IdSchema`, `NameSchema`, `SlugSchema`, `EmailSchema`, `WebsiteSchema`.

**`src/schemas/<entity>.ts`** — per-entity schemas. Pattern:

- `Create<Entity>Schema = object({ … })` with `optional(nullable(string()))` for optional DB fields
- `Update<Entity>Schema = object({ … })` with `optional(string())` for patch fields (no nullable — `undefined` = unchanged)
- `<Entity>FiltersSchema = object({ … })` with `optional(string())` for each filter dimension
- Number fields: valibot `integer()` is a constraint on `number()`, so use `optional(pipe(number(), integer()))` — never bare `integer()`. Type as `bigint(..., { mode: "number" })` in the DB schema to match.
- Types: `type Create<Entity>Input = InferOutput<typeof Create<Entity>Schema>`
- Separate `export type {}` and `export {}` blocks per verbatimModuleSyntax

**`src/schemas/index.ts`** — re-export all schemas and types with separate export-type blocks.

## Step 6 — Auth ACL

**`src/auth.ts`** — `defineAcl({ resource: ["create","delete","read","update"] })`. Each resource is a domain entity name in camelCase.

## Step 7 — Events

**`src/pubsub.ts`** — one `ENTITY_EVENTS` constant object per entity group. Format: `"domain:event_name"`. Export the `events` object, typed event interfaces, per-entity `EntityEventMap`, and a module-level intersection type named `<PascalName>EventMap` (management's is `ManagementPlaneEventMap`), exactly as management does.

## Step 8 — Workflows

**`src/workflows/<entity>.<action>.ts`** — one file per workflow. Builder API:

```ts
import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const <action> = Workflow.name("<entity>.<action>")
  .input(object({ ... }))
  .handler(async (input, ctx) => {
    // 1. Validate / guard (throw for business rules)
    // 2. ctx.step.run("name", async () => { ... }) for each idempotent unit
    // 3. ctx.audit.write({ action, crudAction, entityId, entityType, newState, changes?, previousState? })
    // 4. ctx.pubsub.publish(EVENTS.X, payload)
    // 5. Return result (`.returning()` or `ctx.step.run(fetchStep, { id })`)
  });
```

**`src/workflows/steps/fetch-<entity>.ts`** — reusable `WorkflowStep.name("fetch-<entity>")` for DB lookups. Throw on not-found.

**Grouping**: compose per-entity named objects in module.ts. Management's rule: a group needs a **getter** only when its workflows are bound to a unit at construction time (e.g. `createOnboardTenant(this.#db)` injects the DB unit into `tenants.onboard`). When every workflow resolves its own deps from `ctx.db` at runtime, the group is a stateless `readonly` property. Default to `readonly`; use a getter only when you actually inject a stored unit reference.

## Step 9 — Module class

**`src/index.ts`** — export the module class + config type + `export * from "./types"`.

**`src/module.ts`** — implement `Module`. Match the management hybrid pattern:

```ts
import type { AuthUnit, DatabaseUnit, Module, ModuleInfra, PubSubUnit } from "@aspen-os/platform/server";
import { acl } from "./auth";
import { control_plane_schemas, tenant_schemas } from "./db-schemas";
import { events } from "./pubsub";
import { <Entity>Workflows } from "./workflows/<entity>";

export type <PascalName>Config = undefined;

export class <PascalName> implements Module {
  static create(config: <PascalName>Config): <PascalName> { return new <PascalName>(config); }
  readonly $name = "<name>";
  readonly $dependencies: readonly string[] = [];
  readonly $config: <PascalName>Config;
  #db: DatabaseUnit | null = null;

  constructor(config: <PascalName>Config) { this.$config = config; }

  $prepareInfra(): ModuleInfra {
    return { auth: { acl }, db: { control_plane_schemas, tenant_schemas }, events };
  }

  $initialize(units: { db: DatabaseUnit; auth: AuthUnit; pubsub: PubSubUnit }): void {
    this.#db = units.db;
  }

  $prepareRuntime() {}
  $cleanup() {}

  get <entities>() {
    if (!this.#db) throw new Error("<PascalName> not initialized");
    return { create: create<Entity>, get: get<Entity>, ... };
  }
}
```

**`src/types.ts`** — re-export event types and constants + valibot schemas from schemas/pubsub in separate blocks.

## Step 10 — Doc pages

Create `docs/overview.mdx`, `docs/workflows.mdx`, `docs/access-control.mdx`, `docs/events.mdx`, `docs/db-schemas.mdx` mirroring management's doc structure. Each has frontmatter (`title`, `description`, `icon`) and content extracted from the source code. Follow `DOC-TYPES.md` from the `write-docs` skill for type-appropriate structure.

**Completion**: every public method, table, event, enum, and ACL resource accounted for in at least one doc page.

## Step 11 — Verify

Run in order:

```bash
cd /home/aditya/projects/aspen-os/packages/<name> && bun run check:types   # tsc -b must pass
cd /home/aditya/projects/aspen-os/packages/<name> && bun run check:lint    # oxlint --fix . ; oxfmt . must pass
cd /home/aditya/projects/aspen-os/packages/<name> && bun run build         # writes .output/ + rewrites exports (matches management)
cd /home/aditya/projects/aspen-os && bun run check:types                   # root composite — your package must pass
```

If `check:types` reports errors about the module's own types, rebuild `@aspen-os/platform` first (`cd packages/platform && bun run build` — it publishes to `.output/`, and `tsc` resolves from there) and re-run the package typecheck. Root composite failures in other packages (`tasks`, `drive`, `compliance`, etc.) are pre-existing and not caused by your new module — verify by checking whether your package's errors appear.

**Completion**: all three package-level checks pass, `.output/` is built, and the root composite typechecks.
