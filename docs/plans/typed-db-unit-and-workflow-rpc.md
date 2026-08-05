# Plan: Typed DB Unit + Module-Class-Driven Mutations

## Problem Statement

Two systemic issues exist across the monorepo:

1. **Schema type erasure**: The platform's `DatabaseUnit` uses `NodePgDatabase<Record<string, never>>` everywhere — the `DrizzleDB` type alias, `getContext().db`, `WorkflowContext.db`, and `ModuleInfra.db.*_schemas` are all untyped. Module schema types (strongly-typed `as const` drizzle table objects) are widened to `Record<string, unknown>` at the `ModuleInfra` boundary. Every consumer must re-import schema tables directly from the module package to get per-query type safety.

2. **Schema duplication and ownership violations**: Schemas and their mutation logic are not properly owned by their defining modules.
   - Three of five domain modules (`tasks`, `compliance`, `drive`) have `src/workflows/*.ts` files that are plain async functions doing direct `db.insert`/`db.update`/`db.delete` — they don't use the `Workflow` builder, have no `workflow_runs`/`workflow_steps` persistence, and no step idempotency.
   - Several `services/` files mutate the DB directly, bypassing workflows entirely.
   - The `get _()` facade pattern in `tasks`/`compliance`/`drive` wraps these plain functions, but consumers still import module schemas and make direct DB queries instead of going through the module's class methods.
   - No clear contract: each module should own its schemas AND be the sole gateway to mutate them.

**Goal**: Make the `DatabaseUnit` generic over schema types so that `ctx.db` within a module's own workflows is typed with that module's schemas — no re-importing needed. Route all mutations through the module class's workflow properties (e.g. `p.tasks.tasks.create.run(input)`), so that each module is the sole owner of its schemas and the logic that operates on them. No code outside a module should import that module's schemas or write queries against its tables.

---

## Design Principle: Module Responsibility

Each module owns a complete vertical slice:

```
┌─────────────────────────────────────────────┐
│ Module (e.g. tasks)                         │
│                                             │
│  db-schemas/      → owns the drizzle tables │
│  schemas/         → owns the Valibot inputs │
│  workflows/       → owns ALL mutation logic │
│  services/        → owns read-only helpers  │
│  index.ts (class) → owns the public API     │
│                                             │
│  External callers: p.tasks.tasks.create    │
│  .run(input)  ← the ONLY way to mutate     │
└─────────────────────────────────────────────┘
```

**Rules:**
- **Schemas live where they are defined.** A module's `db-schemas/` and `schemas/` are private to that module. No other module or app code imports them.
- **The module class is the API.** Workflows are exposed as `readonly` properties on the module class, accessed via the platform proxy: `p.<module>.<entity>.<action>.run(input)`.
- **All mutations go through workflows.** No `db.insert`/`db.update`/`db.delete` outside of `Workflow.handler` / `WorkflowStep.handler`.
- **Reads can use `ctx.db` directly** (typed by the framework) or call module workflow read methods — but never by importing another module's schema.

---

## Phase 1: Typed DB Unit (Framework)

Make `DatabaseUnit` generic so it carries schema type information through every boundary: `getContext()`, `WorkflowContext`, and module access. This eliminates the need for modules to re-import their own schema tables for type safety — `ctx.db.query.<table>` works out of the box.

### 1.1 Generic `DatabaseUnit<TSchemas>`

**File**: `packages/platform/src/server/db/unit.ts`

```ts
export class DatabaseUnit<TSchemas extends Record<string, unknown> = Record<string, never>> {
  protected controlPlaneDbInstance: NodePgDatabase<TSchemas>;
  private dbWrapper: NodePgDatabase<TSchemas>;
  protected storedControlPlaneSchemas: TSchemas;
  protected storedTenantSchemas: TSchemas;

  get db(): NodePgDatabase<TSchemas> { return this.dbWrapper; }
  get controlPlaneDb(): NodePgDatabase<TSchemas> { return this.controlPlaneDbInstance; }

  async prepareWithModules<TCP extends Record<string, unknown>, TT extends Record<string, unknown>>(
    controlPlaneSchemas: TCP,
    tenantSchemas: TT,
  ): Promise<void> { ... }
}
```

- `DrizzleDB` type alias becomes `NodePgDatabase<TSchemas>` (parameterized, not hardcoded `Record<string, never>`).
- `getSchemas()` return type includes platform core schemas in the generic param.
- The `createDbWrapper()` Proxy stays the same mechanism — only the return type changes.

### 1.2 Typed `ModuleInfra`

**File**: `packages/platform/src/server/index.ts`

```ts
export type ModuleInfra<
  TCP extends Record<string, unknown> = Record<string, unknown>,
  TT extends Record<string, unknown> = Record<string, unknown>
> = {
  auth: { acl: Record<string, readonly string[]> };
  db: {
    control_plane_schemas: TCP;
    tenant_schemas: TT;
  };
  events: Record<string, Record<string, string>>;
};
```

- `Module.$prepareInfra()` returns `ModuleInfra` with inferred generic params — each module's `as const` schema objects flow through with their types preserved.
- The `Module` interface becomes generic: `Module<N extends string, TCP = {}, TT = {}>`.

### 1.3 Typed `getContext()` and `WorkflowContext`

**Files**: `packages/platform/src/server/utils/context.ts`, `packages/platform/src/server/workflows/types.ts`

```ts
// context.ts — context store now carries typed db
export const context = new AsyncLocalStorage<{
  db: NodePgDatabase<TSchemas>;  // was Record<string, never>
  ...
}>();

// workflows/types.ts — WorkflowContext carries typed db
export interface WorkflowContext<TSchemas = Record<string, never>> {
  db: NodePgDatabase<TSchemas>;
  ...
}
```

- `getContext().db` and `ctx.db` now carry schema types, enabling `ctx.db.query.organization.findFirst(...)` with full type safety within a module's own workflows.
- Existing table-import-based queries (`.from(organization)`) continue to work — table imports become optional, not required for type safety.

### 1.4 Platform-level schema accumulation

**File**: `packages/platform/src/server/base-platform.ts`

- `SingleTenantPlatform.create<M extends Module[]>(config, modules)` infers a combined schema type `S` from `M`.
- `BasePlatform<M, S>` stores `units.db` as `DatabaseUnit<S>`.
- `runInContext` sets `ctx.db` as `NodePgDatabase<S>`.
- The `SingleTenantPlatformInstance<M, S>` proxy accessors type `p.db` as `DatabaseUnit<S>`.

```ts
// Utility: extract merged schema type from module array
type InferControlPlaneSchemas<M extends Module[]> = UnionToIntersection<
  M[number] extends Module<infer N, infer TCP, infer TT> ? TCP : never
>;
type InferTenantSchemas<M extends Module[]> = UnionToIntersection<
  M[number] extends Module<infer N, infer TCP, infer TT> ? TT : never
>;
type MergedSchemas<M extends Module[]> = InferControlPlaneSchemas<M> & InferTenantSchemas<M>;
```

### 1.5 Impact assessment

| Surface | Before | After |
|---|---|---|
| `DatabaseUnit.db` | `NodePgDatabase<Record<string, never>>` | `NodePgDatabase<TSchemas>` |
| `getContext().db` | `NodePgDatabase<Record<string, never>>` | `NodePgDatabase<MergedSchemas<M>>` |
| `WorkflowContext.db` | `NodePgDatabase<Record<string, never>>` | `NodePgDatabase<MergedSchemas<M>>` |
| `ModuleInfra.db.*_schemas` | `Record<string, unknown>` | `TCP` / `TT` (inferred from module) |
| `p.db` (proxy) | `DatabaseUnit` (untyped schemas) | `DatabaseUnit<MergedSchemas<M>>` |

**Backward compatibility**: Default generic param = `Record<string, never>`, so existing code that doesn't supply schema types still compiles. Table-import-based queries continue to work unchanged.

### 1.6 Platform build

After changing exports/types, run `cd packages/platform && bun run build` before typechecking downstream packages (per AGENTS.md — TypeScript resolves types from `.output/`, not source).

---

## Phase 2: Module Class as the Sole Mutation API

The module class IS the public API surface. Workflows are exposed as `readonly` properties, accessed via the platform proxy. No `get _()` facades, no `deps` parameter passing, no direct schema imports from outside the module.

### 2.1 Target pattern (from `organization` — the reference implementation)

```ts
// packages/organization/src/index.ts
export class Organization implements Module {
  readonly $name = "organization";
  readonly $dependencies = [];

  $prepareInfra(): ModuleInfra { ... }
  $initialize() {}
  $prepareRuntime() {}
  $cleanup() {}

  // The public API — workflows as readonly properties
  readonly addresses = addresses;       // { create: WorkflowInstance, update: WorkflowInstance, ... }
  readonly bankAccounts = bankAccounts;
  readonly branches = branches;
  readonly connections = connections;
  readonly organizations = organizations;
}
```

Called via the platform proxy:
```ts
await p.run(async () => {
  await p.organization.organizations.create.run({ name: "Acme" });
  await p.organization.branches.create.run({ organizationId: "..." });
});
```

### 2.2 Eliminate the `get _()` facade pattern

**Before** (`tasks`, `compliance`, `drive`):
```ts
get _() {
  if (!this.#db) throw new Error("Tasks not initialized");
  const deps: TasksDeps = { db: this.#db.db, ... };
  return {
    tasks: { create: (input) => createTask(input, deps), ... },
    projects: { create: (input) => createProject(input, deps), ... },
    ...
  };
}
```

**After** (matching `organization`):
```ts
readonly tasks = tasks;          // { create: WorkflowInstance, update: WorkflowInstance, ... }
readonly projects = projects;
readonly comments = comments;
readonly links = links;
readonly timeEntries = timeEntries;
readonly statuses = statuses;
readonly taskTypes = taskTypes;
readonly reminders = reminders;
readonly automations = automations;
readonly collaboration = collaboration;
readonly views = views;
```

Changes:
- Remove `get _()` getter entirely.
- Remove `#db`, `#pubsub` private fields and `notInitialized()` guards — workflows resolve deps from `WorkflowContext` (via `getContext()`), not from injected `deps`.
- Remove `TasksDeps` / `TasksServiceDeps` / equivalent types and all `deps` parameter passing.
- Each workflow group is an exported `as const` object of `WorkflowInstance`s, assigned as a `readonly` class property.

---

## Phase 3: Migrate Plain-Function "Workflows" to Real Workflow Builder

Three modules (`tasks`, `compliance`, `drive`) have `src/workflows/*.ts` files that are plain async functions with direct DB calls. These must be converted to use the `Workflow.name().input().handler()` builder with `ctx.step.run()`, matching the `organization` and `management-plane` pattern.

### 3.1 Conversion template

**Before** (`tasks/workflows/task.ts`):
```ts
export async function createTask(input: CreateTaskInput, deps: TasksServiceDeps) {
  const { db } = deps;
  const parsed = parse(CreateTaskSchema, input);
  const [task] = await db.insert(s.task).values({ ... }).returning();
  return task;
}
```

**After**:
```ts
export const createTask = Workflow.name("task.create")
  .input(CreateTaskSchema)
  .handler(async (input, ctx) => {
    const [task] = await ctx.db.insert(s.task).values({ ... }).returning();
    await ctx.pubsub.publish(TASKS_EVENTS.task_created, { id: task.id });
    return task;
  });
```

Key differences:
- `deps` parameter removed — `ctx` provides `db`, `pubsub`, `audit`, `auth`.
- Input validation handled by `.input(schema)` — no manual `parse()`.
- Run persisted to `workflow_runs` / `workflow_steps` — audit trail and idempotency for free.
- Schema tables still imported within the module's own workflow files (this is fine — the module owns its schemas).

### 3.2 Module-by-module scope

#### tasks (11 workflow files, ~80 functions)
| File | Functions to convert |
|---|---|
| `workflows/task.ts` | createTask, updateTask, deleteTask, getTask, listTasks, assignTask, setTaskStatus, moveTask, setPriority, setDueDate |
| `workflows/project.ts` | createProject, updateProject, deleteProject, addMember, removeMember, updateMember |
| `workflows/comment.ts` | createComment, updateComment, deleteComment |
| `workflows/link.ts` | createLink, deleteLink |
| `workflows/time-entry.ts` | createTimeEntry, updateTimeEntry, deleteTimeEntry |
| `workflows/status.ts` | createStatus, updateStatus, deleteStatus, reorderStatus, createTransition, deleteTransition |
| `workflows/task-type.ts` | createTaskType, updateTaskType, deleteTaskType, createLabel, updateLabel, deleteLabel |
| `workflows/reminder.ts` | createReminder, updateReminder, deleteReminder, snoozeReminder |
| `workflows/automation.ts` | createRule, updateRule, deleteRule, toggleRule |
| `workflows/collaboration.ts` | addWatcher, removeWatcher, addAttachment, removeAttachment, logActivity |
| `workflows/view.ts` | createView, updateView, deleteView |

**Exposure** (`index.ts`):
```ts
readonly tasks = tasks;
readonly projects = projects;
readonly comments = comments;
readonly links = links;
readonly timeEntries = timeEntries;
readonly statuses = statuses;
readonly taskTypes = taskTypes;
readonly reminders = reminders;
readonly automations = automations;
readonly collaboration = collaboration;
readonly views = views;
```

#### compliance (5 workflow files, ~25 functions)
| File | Functions to convert |
|---|---|
| `workflows/document.ts` | createDocument, updateDocument, deleteDocument, getDocument, listDocuments |
| `workflows/obligation.ts` | createObligation, updateObligation, deleteObligation, getObligation, listObligations |
| `workflows/verification.ts` | createRule, updateRule, deleteRule, getRule, listRules |
| `workflows/audit.ts` | (read-only — keep as plain functions or convert to read workflows) |
| `workflows/dashboard.ts` | (read-only — keep as plain functions or convert to read workflows) |

**Exposure** (`index.ts`):
```ts
readonly documents = documents;
readonly obligations = obligations;
readonly verification = verification;
readonly audit = audit;
readonly dashboard = dashboard;
```

#### drive (6 workflow files, ~30 functions)
| File | Functions to convert |
|---|---|
| `workflows/folder.ts` | createFolder, updateFolder, deleteFolder, moveFolder, getFolder, listFolders |
| `workflows/file.ts` | uploadFile, updateFile, deleteFile, getFile, listFiles |
| `workflows/share.ts` | createShare, updateShare, deleteShare, getShare, listShares |
| `workflows/public-link.ts` | createPublicLink, updatePublicLink, deletePublicLink, getPublicLink |
| `workflows/label.ts` | createLabel, updateLabel, deleteLabel, attachLabel, detachLabel |
| `workflows/trash.ts` | moveToTrash, restoreFromTrash, emptyTrash, purgeItem |

**Exposure** (`index.ts`):
```ts
readonly folders = folders;
readonly files = files;
readonly shares = shares;
readonly publicLinks = publicLinks;
readonly labels = labels;
readonly trash = trash;
```

---

## Phase 4: Refactor Services — Eliminate Direct DB Writes

Services that make **direct DB writes** must be refactored to call workflows (the module's own class methods) instead. This ensures all mutations are funneled through the workflow engine, with persistence and audit trail.

### 4.1 Services with direct writes → call workflows

| Module | Service | Current behavior | Refactored to |
|---|---|---|---|
| compliance | `services/obligation-generator.ts` | `db.insert(complianceDocument)` directly | Call `documents.create.run(input)` within a scheduled workflow handler |
| compliance | `services/audit-writer.ts` | `db.insert(complianceAuditEntry)` directly (parallel audit system) | Use `ctx.audit.write(...)` (platform `AuditUnit`) — eliminate the duplicate audit table |
| drive | `services/access-service.ts` (write methods) | `db.insert(driveAccessLog)` directly | Fold into the file/folder workflow as a step, or call a dedicated `access.log` workflow |
| drive | `services/path-service.ts` (write methods) | `db.update(driveFolder)` / `db.update(driveFile)` for path cascade | Fold into `folders.move` workflow as a step (path recalculation is part of move) |

### 4.2 Read-only services — keep, but use typed context

Services that are **read-only** remain as plain functions. They don't mutate state, so they don't need the workflow engine. But they should use `getContext().db` (now typed) instead of a `deps` object:

| Module | Service | Status |
|---|---|---|
| tasks | `services/report-service.ts` | Keep as read-only — use typed `getContext().db` instead of `deps.db` |
| tasks | `services/dependency-graph.ts` | Keep as read-only — use typed `getContext().db` |
| drive | `services/search-service.ts` | Keep as read-only |
| drive | `services/archive-service.ts` | Keep as read-only |
| drive | `services/access-service.ts` (read methods) | Keep permission checks as read-only |
| drive | `services/path-service.ts` (read methods) | Keep path resolution as read-only |
| tasks | `services/notification-bridge.ts` | Keep — pubsub only, no DB |

### 4.3 Remove `deps` parameter pattern from read services

**Before**:
```ts
export async function getTaskSummary(deps: TasksServiceDeps) {
  const { db } = deps;
  return db.select(...).from(s.task);
}
```

**After**:
```ts
import { getContext } from "@aspen-os/platform/server";

export async function getTaskSummary() {
  const { db } = getContext();
  return db.select(...).from(s.task);
}
```

---

## Phase 5: How Callers Use Modules (The Contract)

After migration, the module class is the sole API. Here's how different callers interact:

### 5.1 Server-side (server functions, route handlers, other modules)

```ts
import { p } from "#aspen/server";

// All mutations go through the module class via platform proxy
await p.run(async () => {
  // Create a task — calls the tasks module's workflow
  const task = await p.tasks.tasks.create.run({
    title: "Review proposal",
    projectId: "proj_123",
  });

  // Upload a file — calls the drive module's workflow
  const file = await p.drive.files.upload.run({
    folderId: "fld_abc",
    filename: "proposal.pdf",
  });

  // Read via workflow (with persistence) or direct typed query (no import needed)
  const org = await p.organization.organizations.get.run({ id: "org_1" });
});
```

**No schema imports.** The caller never imports `task` from `@aspen-os/tasks` or `organization` from `@aspen-os/organization`. They call the module's class methods.

### 5.2 Cross-module reads

If module B needs data owned by module A, it calls module A's workflow:

```ts
// Inside a tasks workflow that needs organization info
const org = await ctx.db.query.organization.findFirst({
  where: eq(organization.id, input.orgId),
});
// OR call the organization module's read workflow:
// (if the platform proxy is accessible in context)
```

For typed `ctx.db.query.*` access, the typed DB unit (Phase 1) provides the types. The query runs against the same DB, but the types come from the framework's merged schema registry — not from importing the module's schema files.

### 5.3 What NEVER happens post-migration

```ts
// ❌ Never import another module's schemas
import { task } from "@aspen-os/tasks/db-schemas";  // FORBIDDEN
import { complianceDocument } from "@aspen-os/compliance/db-schemas";  // FORBIDDEN

// ❌ Never write direct DB mutations outside workflows
await p.run(async () => {
  const { db } = getContext();
  await db.insert(task).values({ ... });  // FORBIDDEN — no workflow record
});

// ❌ Never use get _() facades
const result = await p.tasks._.tasks.create(input);  // FORBIDDEN — use .run()

// ❌ Never pass deps objects to workflows
createTask(input, { db, pubsub });  // FORBIDDEN — use WorkflowContext
```

---

## Phase 6: Migration Order & Sequencing

### Step-by-step (each step is independently shippable)

| Step | Scope | Risk | Est. effort |
|---|---|---|---|
| 1 | Make `DatabaseUnit` generic (`TSchemas` param, default = `Record<string, never>`) | Low — additive, backward compatible | S |
| 2 | Make `ModuleInfra` generic, update `Module` interface | Low — additive generic params | S |
| 3 | Update `getContext()` + `WorkflowContext` to use `TSchemas` | Low — type-only change | S |
| 4 | Update `BasePlatform` to infer `MergedSchemas<M>` and thread through `runInContext` | Medium — complex conditional type | M |
| 5 | Build platform (`bun run build`), typecheck all packages | — | S |
| 6 | Convert `tasks` workflows to `Workflow` builder (11 files, ~80 functions) | Medium | L |
| 7 | Convert `tasks` module class: `get _()` → readonly workflow properties, remove `deps`/`#db` | Low — mechanical | S |
| 8 | Refactor `tasks` services: remove direct writes, use `getContext().db` for reads | Low | S |
| 9 | Convert `compliance` workflows to `Workflow` builder (5 files, ~25 functions) | Medium | M |
| 10 | Refactor `compliance` services: `obligation-generator` → call workflow, `audit-writer` → use `ctx.audit` | Medium — logic change | M |
| 11 | Convert `compliance` module class: `get _()` → readonly properties | Low — mechanical | S |
| 12 | Convert `drive` workflows to `Workflow` builder (6 files, ~30 functions) | Medium | M |
| 13 | Refactor `drive` services: fold path-cascade writes into `folders.move` workflow, fold access-log writes into file/folder workflows | Medium | M |
| 14 | Convert `drive` module class: `get _()` → readonly properties | Low — mechanical | S |
| 15 | Final typecheck + lint across all packages | — | S |

### Parallelization

Steps 6–8 (tasks), 9–11 (compliance), 12–14 (drive) can be parallelized across three developers/agents once Steps 1–5 are complete.

---

## Phase 7: Anti-Patterns to Enforce Post-Migration

1. **No `db.insert`/`db.update`/`db.delete` outside `Workflow.handler` or `WorkflowStep.handler`** — all mutations go through workflows.
2. **No importing a module's schemas from outside that module** — schemas are private to their owning module. Cross-module data access goes through the owning module's class methods (`p.<module>.<entity>.<action>.run(input)`) or typed `ctx.db.query.*` (types provided by the framework, not by importing schema files).
3. **No `get _()` facades** — modules expose workflows as `readonly` properties (the `organization` pattern).
4. **No `deps` parameter passing** — workflows resolve `db`, `pubsub`, `audit`, `auth` from `WorkflowContext` (via `getContext()`).
5. **No parallel audit systems** — use `ctx.audit.write(...)` (platform `AuditUnit`), not module-specific audit tables with direct `db.insert`.
6. **Each module is the sole owner of its schemas and mutation logic** — schemas, validation, workflows, and the public class API all live in the module's package. No other package duplicates or redefines them.

---

## Appendix: Files to Modify

### Framework (`packages/platform`)
| File | Change |
|---|---|
| `src/server/db/unit.ts` | Make `DatabaseUnit<TSchemas>` generic, update `DrizzleDB` alias |
| `src/server/db/index.ts` | Re-export generic `DatabaseUnit` |
| `src/server/index.ts` | Make `ModuleInfra`, `Module` generic over schema types |
| `src/server/base-platform.ts` | Add `MergedSchemas<M>` utility type, thread through `runInContext` |
| `src/server/create-single-tenant.ts` | Infer `MergedSchemas<M>`, pass to `DatabaseUnit` |
| `src/server/create-shared-tenant.ts` | Same |
| `src/server/create-isolated-tenant.ts` | Same |
| `src/server/utils/context.ts` | Make `context` AsyncLocalStorage generic over `TSchemas` |
| `src/server/workflows/types.ts` | Make `WorkflowContext<TSchemas>` generic |

### Domain modules
| Module | Files to change |
|---|---|
| `tasks` | 11 workflow files (convert to `Workflow` builder), `index.ts` (class: `get _()` → readonly properties, remove `deps`/`#db`), 2 service files (remove direct writes) |
| `compliance` | 5 workflow files (convert to `Workflow` builder), `index.ts` (class), 2 service files (`obligation-generator` → workflow call, `audit-writer` → `ctx.audit`) |
| `drive` | 6 workflow files (convert to `Workflow` builder), `index.ts` (class), 2 service files (fold writes into workflows) |
| `organization` | No change — already conforms (reference implementation) |
| `management-plane` | No change — already conforms (reference implementation) |

### Example app
| File | Change |
|---|---|
| `examples/recruiter/src/routes/` | Add example route calling `p.tasks.tasks.create.run(input)` inside `p.run()` to demonstrate the class-method API |
