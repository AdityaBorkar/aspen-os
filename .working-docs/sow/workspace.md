# `@aspen-os/workspace` Module — Drafts, Filter Views & Dashboards (Scope of Work)

> SOW: create new `workspace` module — generic personal-workspace surfaces: **drafts** (saved, unpublished content, optional approval lifecycle + comments), **filter views** (cross-domain saved filter/sort/group configs, applied via host-registered resolver registry), **dashboards** (metric/breakdown/list/embed widgets over grid layout, optional scheduled delivery) + supporting utilities: **pins, recent items, quick search, settings, watches**. Every entity **access set by user** at create/update to `personal` (owner-only) or `global` (org-wide within tenant).
>
> **Status — as of Aug 2026:** **Complete.** Phases 0–6 done. `@aspen-os/workspace` implemented (drafts, filter views, dashboards, widgets, schedules, + pins/recent/settings/watches/search utilities), docs + domain records updated, all gates green.

## Confirmed Decisions

| #   | Decision            | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Access model        | First-class `access` enum — `personal` / `global` — on **drafts, filter views, dashboards**, set by user at create/update. `personal` = visible only to `ownerId`; `global` = org-wide within tenant. Widgets + schedules **inherit** parent dashboard access (no own access column). Replaces ad-hoc `isShared`/`isGlobal` booleans of dms/tasks in this module.                                                                                                                                 |
| 2   | Drafts              | **Generic free-form content**: `title`, `body` (markdown/text), `notes`, `metadata` (opaque). Lifecycle `draft → submitted → approved → published` w/ `reject` (→ `reopened` back to `draft`), `reopen`, `trash`/`restore` (soft-delete via `deletedAt`), `duplicate`, threaded comments (`workspace_draft_comment`). **Approval optional** — hosts w/o review step call `publish` directly from `draft`. **Dependency-free** — workspace never creates entities in other modules; host app does. |
| 3   | Filter views        | Cross-domain saved filter/sort/group configs. `domain` **free-form text** (documented registry for built-ins; app-defined like `recruiter:candidate` allowed). Conditions use dms `FileViewCondition` shape `{ field, operator, value }`; sort uses `{ field, direction }`. Stored **opaquely**; `apply` resolves conditions against **host-registered resolver** (runtime.ts registry), not workspace tables.                                                                                    |
| 4   | Dashboards          | Named collection of widgets + grid layout. `layout` jsonb array of placements `{ widgetId, x, y, w, h }` stored **on dashboard**. Supports `duplicate`, `export` (JSON snapshot incl. widgets), `import`, per-dashboard **schedules** (cron-triggered delivery events). No widget-overlap validation in v1.                                                                                                                                                                                       |
| 5   | Widgets             | Four types: `metric` (count/sum/avg/min/max over domain + filter + **date range**), `breakdown` (group-by field + range), `list` (first-N rows + range), `embed` (markdown / url / iframe). **Declarative configs** — module stores + serves; does **not** execute analytics or render. Runtime metadata (`lastRefreshedAt`, `lastError`) tracked so hosts surface stale/failed widgets.                                                                                                          |
| 6   | Widget datasource   | Datasource = `{ domain }` + **either** inline `filter` **or** `viewId` soft-FK to saved filter view. Dashboards compose directly with filter views.                                                                                                                                                                                                                                                                                                                                               |
| 7   | Runtime enforcement | `list()`/`get()` return rows where `access = 'global' OR ownerId = actorId`. Mutation requires ownership (or tenant admin). ACL = module capability matrix; **runtime scoping in workflow code** (same split as dms) via shared `services/access-service.ts`. Utility surfaces (pins/recent/settings/watches) always user-scoped (no access field).                                                                                                                                               |
| 8   | Tables              | 10 tenant tables: `workspace_draft`, `workspace_draft_comment`, `workspace_view`, `workspace_dashboard`, `workspace_widget`, `workspace_pin`, `workspace_recent`, `workspace_watch`, `workspace_setting`, `workspace_schedule` + 4 pgEnums. Columns/names per DOMAIN_MODEL.md conventions (text `uuidv7` PKs, timestamptz, snake_case).                                                                                                                                                           |
| 9   | Module surface      | `p.workspace.{drafts, views, dashboards, widgets, schedules, pins, recent, search, settings, watches}`. Widgets **top-level group** (distinct entity + ACL resource); workflows under `workflows/dashboard/widget/*.ts` (subresource folders).                                                                                                                                                                                                                                                    |
| 10  | Dependencies        | `$dependencies = []` (no domain-module deps — `domain` opaque). **Stateful**: `$initialize({ db, pubsub })`; `$prepareRuntime()` registers schedule runner + handler (dms expiry-scanner/purge-service pattern), `$cleanup()` unregisters. Host apps plug view resolvers into `runtime.ts` at startup (dms `setDmsStorage` precedent).                                                                                                                                                            |
| 11  | Events & ACL        | `workspace:*` events (see §2.4). ACL resources `draft`, `filterView`, `dashboard`, `widget`, `schedule`, `pin`, `recent`, `watch`, `setting`, `draftComment`, `search` w/ non-CRUD actions in §2.5.                                                                                                                                                                                                                                                                                               |
| 12  | Build step          | Build-step package w/ `build` config block (like dms/organization/masters), root `tsconfig.json` reference, `docs/source.config.ts` entry.                                                                                                                                                                                                                                                                                                                                                        |

---

## 1. Current State & Inventory

### 1.1 Existing saved-view / access-scope / utility precedents

| Package / table         | Mechanism                                                                                                         | Access scoping                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| dms `dms_file_view`     | Saved filter+sort over active files; `conditions`/`sort` jsonb; `isDefault`; `apply` workflow resolves conditions | `isShared` boolean + `ownerId`     |
| tasks `task_saved_view` | Saved filter/sort/group; `type` (list/board/calendar/timeline); `isDefault`; optional `projectId`                 | `isShared` boolean + `ownerId`     |
| dms `dms_label`         | Color-coded tags                                                                                                  | `isGlobal` boolean + `ownerId`     |
| dms `dms_pin`           | Per-user pinned items (triage/file-view/class)                                                                    | `userId` only (always personal)    |
| dms `dms_setting`       | Per-module settings (`get`/`set` workflow group)                                                                  | n/a                                |
| tasks `task_watcher`    | Users subscribed to task updates                                                                                  | `userId` only                      |
| compliance `dashboard`  | Module-local summary metrics workflow (health score, counts) over **its own** tables                              | n/a — module-specific, not generic |

**No generic drafts surface** (several modules use `draft` as _status value_ — recruitment contracts/requisitions/offers, compliance documents — but none persists saved, unpublishable draft entity), **no dashboard entity**, **no cross-domain saved-view surface**, no cross-module pins/recent/search/settings/watch layer.

### 1.2 Terminology collisions (watch out)

- CONTEXT.md lists `Workspace` as _avoid_ for **Tenant** and tasks **Project**/Board. Module name deliberate: here _workspace_ = **personal-workspace surface** (drafts / views / dashboards / utilities), not tenancy or project board. Domain-language entry must disambiguate.
- `watches.subscribe` / `watches.unsubscribe` = **follow-subscriptions** on views/dashboards (tasks-watcher vocabulary) — distinct from `PubSubUnit.subscribe`/`unsubscribe` (pg-boss). Note in domain-language entry.
- `access` as column name not Postgres reserved word, no collision with existing repo schemas (grep-verified baseline below).

### 1.3 Baseline greps (must be clean before Phase 1)

`workspace_draft`, `workspace_draft_comment`, `workspace_view`, `workspace_dashboard`, `workspace_widget`, `workspace_pin`, `workspace_recent`, `workspace_watch`, `workspace_setting`, `workspace_schedule` table names; `p.workspace` accessor; `workspace:` pubsub topics — **no matches anywhere in repo**. All names free.

---

## 2. Target Model

### 2.1 Tables (all `tenant_schemas`; columns sorted alphabetically by TS name; `uuidv7` PKs; timestamptz `createdAt`/`updatedAt`)

**`workspace_draft`**

| Column             | Type                          | Notes                                                                  |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `access`           | enum `workspace_access`       | `personal`/`global`, default `personal`                                |
| `approvedAt`       | timestamptz (nullable)        |                                                                        |
| `approvedBy`       | text (nullable)               |                                                                        |
| `body`             | text                          | markdown/text content, default `''`                                    |
| `createdAt`        | timestamptz                   |                                                                        |
| `deletedAt`        | timestamptz (nullable)        | soft-delete (trash); set by `trash`, cleared by `restore`              |
| `id`               | text PK `uuidv7`              |                                                                        |
| `metadata`         | jsonb                         | opaque — attachment refs, structured fields                            |
| `notes`            | text                          | free-form annotation                                                   |
| `ownerId`          | text                          | creating user (soft FK to better-auth `user`)                          |
| `publishedAt`      | timestamptz (nullable)        |                                                                        |
| `publishedBy`      | text (nullable)               |                                                                        |
| `rejectedAt`       | timestamptz (nullable)        |                                                                        |
| `rejectedBy`       | text (nullable)               |                                                                        |
| `rejectionReason`  | text (nullable)               |                                                                        |
| `status`           | enum `workspace_draft_status` | `draft`/`submitted`/`approved`/`rejected`/`published`, default `draft` |
| `submittedAt`      | timestamptz (nullable)        |                                                                        |
| `submittedBy`      | text (nullable)               |                                                                        |
| `targetDomain`     | text (nullable)               | what draft becomes on publish (e.g. `dms:file`, `hr:announcement`)     |
| `targetEntityId`   | text (nullable)               | recorded after host creates target entity                              |
| `targetEntityType` | text (nullable)               | entity type within the domain                                          |
| `title`            | text                          | required                                                               |
| `updatedAt`        | timestamptz                   |                                                                        |

Indexes: `idx_workspace_draft_owner`(ownerId), `idx_workspace_draft_status`(status), `idx_workspace_draft_access`(access).

**`workspace_draft_comment`**

| Column      | Type             | Notes                          |
| ----------- | ---------------- | ------------------------------ |
| `authorId`  | text (notNull)   | soft FK → better-auth `user`   |
| `content`   | text (notNull)   |                                |
| `createdAt` | timestamptz      |                                |
| `draftId`   | text (notNull)   | soft FK → `workspace_draft.id` |
| `id`        | text PK `uuidv7` |                                |
| `updatedAt` | timestamptz      |                                |

Indexes: `idx_workspace_draft_comment_draft`(draftId).

**`workspace_view`**

| Column       | Type                      | Notes                                             |
| ------------ | ------------------------- | ------------------------------------------------- |
| `access`     | enum `workspace_access`   | default `personal`                                |
| `conditions` | jsonb (`ViewCondition[]`) | `{ field, operator, value }`, default `[]`        |
| `createdAt`  | timestamptz               |                                                   |
| `domain`     | text (notNull)            | free-form dataset key, registry documented (§2.6) |
| `groupBy`    | text (nullable)           | group-by field                                    |
| `id`         | text PK `uuidv7`          |                                                   |
| `isDefault`  | boolean, default `false`  | per `(ownerId, domain)`                           |
| `metadata`   | jsonb                     |                                                   |
| `name`       | text (notNull)            |                                                   |
| `ownerId`    | text                      |                                                   |
| `sort`       | jsonb (`ViewSort[]`)      | `{ field, direction }`, default `[]`              |
| `updatedAt`  | timestamptz               |                                                   |

Indexes: `idx_workspace_view_domain_access`(domain, access), `idx_workspace_view_owner`(ownerId).

**`workspace_dashboard`**

| Column        | Type                        | Notes                                    |
| ------------- | --------------------------- | ---------------------------------------- |
| `access`      | enum `workspace_access`     | default `personal`                       |
| `createdAt`   | timestamptz                 |                                          |
| `description` | text (nullable)             |                                          |
| `id`          | text PK `uuidv7`            |                                          |
| `layout`      | jsonb (`WidgetPlacement[]`) | `{ widgetId, x, y, w, h }`, default `[]` |
| `metadata`    | jsonb                       |                                          |
| `name`        | text (notNull)              |                                          |
| `ownerId`     | text                        |                                          |
| `updatedAt`   | timestamptz                 |                                          |

Indexes: `idx_workspace_dashboard_owner`(ownerId), `idx_workspace_dashboard_access`(access).

**`workspace_widget`**

| Column            | Type                         | Notes                                                                 |
| ----------------- | ---------------------------- | --------------------------------------------------------------------- |
| `config`          | jsonb (notNull)              | type-specific, incl. `range` (§2.2)                                   |
| `createdAt`       | timestamptz                  |                                                                       |
| `dashboardId`     | text (notNull)               | soft FK → `workspace_dashboard.id`                                    |
| `domain`          | text (nullable)              | datasource domain; required for metric/breakdown/list, null for embed |
| `filter`          | jsonb (nullable)             | inline `ViewCondition[]`; mutually exclusive with `viewId`            |
| `id`              | text PK `uuidv7`             |                                                                       |
| `lastError`       | text (nullable)              | set by `widgets.refresh` on failure                                   |
| `lastRefreshedAt` | timestamptz (nullable)       | set by `widgets.refresh`                                              |
| `title`           | text (notNull)               |                                                                       |
| `type`            | enum `workspace_widget_type` | `metric`/`breakdown`/`list`/`embed`                                   |
| `updatedAt`       | timestamptz                  |                                                                       |
| `viewId`          | text (nullable)              | soft FK → `workspace_view.id` (reuse saved view's conditions)         |

Indexes: `idx_workspace_widget_dashboard`(dashboardId).

**`workspace_schedule`**

| Column        | Type                    | Notes                                                                |
| ------------- | ----------------------- | -------------------------------------------------------------------- |
| `config`      | jsonb (notNull)         | `{ recipients: string[], format: "export"\|"pdf"\|"url", subject? }` |
| `createdAt`   | timestamptz             |                                                                      |
| `createdBy`   | text (notNull)          |                                                                      |
| `cron`        | text (notNull)          | pg-boss cron expression (e.g. `"0 8 * * *"`)                         |
| `dashboardId` | text (notNull)          | soft FK → `workspace_dashboard.id` (access inherited)                |
| `id`          | text PK `uuidv7`        |                                                                      |
| `isActive`    | boolean, default `true` | `pause`/`resume`                                                     |
| `lastError`   | text (nullable)         |                                                                      |
| `lastRunAt`   | timestamptz (nullable)  | set by `markRun` after host delivery                                 |
| `updatedAt`   | timestamptz             |                                                                      |

Indexes: `idx_workspace_schedule_dashboard`(dashboardId).

**Utility tables** (all `userId`-scoped — always personal, no access column):

| Table               | Key columns                                                              | Notes                                                                                               |
| ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `workspace_pin`     | `userId`, `itemType` (enum `workspace_item_type`), `itemId`, `sortOrder` | sidebar shortcuts; unique `(userId, itemType, itemId)`                                              |
| `workspace_recent`  | `userId`, `itemType`, `itemId`, `lastAccessedAt`                         | recent items; unique `(userId, itemType, itemId)`, `touch` upserts + bumps                          |
| `workspace_watch`   | `userId`, `itemType`, `itemId`                                           | follow view/dashboard; unique `(userId, itemType, itemId)`                                          |
| `workspace_setting` | `key`, `userId`, `value` (jsonb)                                         | unique `(key, userId)`; keys `home_dashboard`, `default_view.<domain>`, `default_range`, `timezone` |

**pgEnums** (`db-schemas/enums.ts`): `workspace_access` (`personal`/`global`), `workspace_draft_status` (`draft`/`submitted`/`approved`/`rejected`/`published`), `workspace_widget_type` (`metric`/`breakdown`/`list`/`embed`), `workspace_item_type` (`draft`/`view`/`dashboard`) — shared by pins, recent, watches.

### 2.2 Widget configs (jsonb shapes, validated by valibot)

| Type        | Shape                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| `metric`    | `{ aggregation: "count"\|"sum"\|"avg"\|"min"\|"max", field?: string, range?: WidgetRange }` |
| `breakdown` | `{ field: string, limit?: number, order?: "asc"\|"desc", range?: WidgetRange }`             |
| `list`      | `{ columns?: string[], limit?: number, range?: WidgetRange }`                               |
| `embed`     | `{ kind: "markdown"\|"url"\|"iframe", content: string, height?: number }`                   |

`WidgetRange = { preset: "today"\|"yesterday"\|"this_week"\|"last_7_days"\|"this_month"\|"this_quarter"\|"this_year"\|"all_time"\|"custom", from?: string, to?: string }` — date presets cover time-windowed dashboards HMS/ERP/recruiting all need (occupancy today, receivables MTD, pipeline this week).

Layout: `WidgetPlacement = { widgetId, x, y, w, h }` (all numbers), validated on dashboard create/update + widget add/move.

### 2.3 Module surface (`p.workspace.*`)

```
p.workspace.drafts     { addComment, approve, create, delete, duplicate, get, list, listComments,
                         publish, reject, removeComment, reopen, restore, submit, trash, update }
p.workspace.views      { apply, create, delete, duplicate, get, list, setDefault, update }
p.workspace.dashboards { create, delete, duplicate, export, get, import, list, update }
p.workspace.widgets    { add, get, list, move, refresh, remove, update }
p.workspace.schedules  { create, delete, list, markRun, pause, resume, update }
p.workspace.pins       { create, delete, list }
p.workspace.recent     { list, touch }
p.workspace.search     { quick }
p.workspace.settings   { get, set }
p.workspace.watches    { list, subscribe, unsubscribe }
```

- **Drafts** — `submit` (`draft → submitted`), `approve` (`submitted → approved`, records `approvedBy/At`), `reject` (`submitted → rejected`, requires `rejectionReason`), `publish` (`approved → published`, or `draft → published` w/o review step — records `publishedBy/At`), `reopen` (`published|rejected → draft`, clears lifecycle timestamps except `rejectedAt` history retained via audit), `trash`/`restore` (soft-delete), `duplicate` (new `draft` copy), `addComment`/`listComments`/`removeComment`.
- **Filter views** — `apply(id, { limit, offset })` resolves conditions through host-registered resolver for view's `domain` (throws if none registered); `setDefault` clears `isDefault` on owner's other views for same `domain`; `duplicate` copies view (new id, default `access = personal`).
- **Dashboards** — `duplicate` copies dashboard + widgets (new ids); `export` returns `{ dashboard, widgets, layout }`; `import` recreates from snapshot.
- **Widgets** — `refresh(id, { error? })` sets `lastRefreshedAt` (+ `lastError` on failure); `move` updates parent dashboard's `layout` array entry.
- **Schedules** — `create` registers pg-boss cron for schedule; `pause`/`resume` toggle `isActive` (+ cron); `markRun(id, { at?, error? })` records delivery completion (host calls after delivering). Delivery **event-driven**: workspace cron handler publishes `workspace:schedule_due`; host renders/emails.
- **Recent** — `touch(itemType, itemId)` upserts + bumps `lastAccessedAt`; `list({ limit })` returns caller's recent items.
- **Search** — `quick({ q, limit })` access-scoped type-ahead over drafts (title/body), views (name/domain), dashboards (name/description); merged, typed results.
- **Settings** — `get(key)`, `set(key, value)` per user; keys `home_dashboard`, `default_view.<domain>`, `default_range`, `timezone`.
- Every `.list()` workflow follows standardized filter contract: access-scoped default (`global OR owner`), entity-specific filters (`status`/`targetDomain`/`includeTrashed` for drafts, `domain`/`isDefault` for views, `dashboardId` for widgets), `search` on name/title, `limit`/`offset` (`optional(pipe(number(), integer()))` — never bare `integer()`).

### 2.4 Events (`workspace:*`)

- **Drafts**: `draft_created` / `draft_updated` / `draft_submitted` / `draft_approved` / `draft_rejected` / `draft_published` / `draft_reopened` / `draft_trashed` / `draft_restored` / `draft_duplicated` / `draft_commented` / `draft_comment_removed` / `draft_deleted`
- **Views**: `view_created` / `view_updated` / `view_duplicated` / `view_deleted`
- **Dashboards**: `dashboard_created` / `dashboard_updated` / `dashboard_duplicated` / `dashboard_scheduled` / `dashboard_unscheduled` / `dashboard_deleted`
- **Widgets**: `widget_added` / `widget_updated` / `widget_refreshed` / `widget_removed`
- **Utilities**: `pin_created` / `pin_removed` / `watch_subscribed` / `watch_unsubscribed` / `schedule_due`

Payloads typed via `EventMap`; topics published as plain strings (per convention). `draft_published` + `schedule_due` carry full payloads (draft row / schedule + dashboard + config) so hosts act without follow-up reads.

### 2.5 ACL resources

```ts
defineAcl({
  draft: [
    "create",
    "read",
    "update",
    "delete",
    "trash",
    "restore",
    "publish",
    "submit",
    "approve",
    "reject",
    "reopen",
    "duplicate",
    "comment",
  ],
  draftComment: ["create", "read", "delete"],
  filterView: ["create", "read", "update", "delete", "set_default", "apply", "duplicate"],
  dashboard: ["create", "read", "update", "delete", "duplicate", "export", "import"],
  widget: ["create", "read", "update", "delete", "refresh"],
  schedule: ["create", "read", "update", "delete", "pause", "resume", "mark_run"],
  pin: ["create", "read", "delete"],
  recent: ["read", "touch"],
  watch: ["create", "read", "delete"],
  setting: ["read", "update"],
  search: ["read"],
});
```

Runtime visibility (personal vs global) **not** part of ACL — enforced in workflow code via `services/access-service.ts`, exactly as dms splits layers. Pins/recent/settings/watches user-scoped at row level (`userId`).

### 2.6 Built-in view domains (documented registry — open-ended, not enforced)

`workspace:draft`, `tasks:task`, `dms:file`, `compliance:document`, `hr:employee` — plus app-defined domains (`recruiter:candidate`, `inventory:goods`, `hospital:patient`, …). `domain` stays text column; registry = documentation + naming convention (`<module>:<entity>`).

---

## 3. Phase 0 — Constants & Enums

1. `utils/constants.ts`: `WORKSPACE_ACCESS` (`PERSONAL`/`GLOBAL`), `DRAFT_STATUS` (`DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED`/`PUBLISHED`), `WIDGET_TYPE` (`METRIC`/`BREAKDOWN`/`LIST`/`EMBED`), `WIDGET_AGGREGATION` (`COUNT`/`SUM`/`AVG`/`MIN`/`MAX`), `EMBED_KIND` (`MARKDOWN`/`URL`/`IFRAME`), `WORKSPACE_ITEM_TYPE` (`DRAFT`/`VIEW`/`DASHBOARD`), `RANGE_PRESET` (9 presets from §2.2), `SETTING_KEYS` (`HOME_DASHBOARD`, `DEFAULT_VIEW`, `DEFAULT_RANGE`, `TIMEZONE`), `SCHEDULE_FORMAT` (`EXPORT`/`PDF`/`URL`), `VIEW_DOMAIN` (documented built-in domains `as const`), + `AUDIT_ACTION`/`AUDIT_ENTITY_TYPE` literals (`"workspace:draft"`-style) for `ctx.audit.write(...)`.
2. `db-schemas/enums.ts`: four `pgEnum`s from §2.1 (values referencing constant objects).
3. Re-run §1.3 baseline greps — confirm clean.
4. Gate: `cd packages/workspace && bun run check:types && bun run check:lint` (after scaffold; Phase 0 files land in Phase 1 scaffold).

## 4. Phase 1 — Scaffold `packages/workspace`

1. Load `write-module` skill (`.agents/skills/write-module/SKILL.md`); scaffold `packages/workspace` on dms module template (build step + `build` config block).
2. Add root `tsconfig.json` references + `docs/source.config.ts` (workspace docs source).
3. Implement ten tables, `db-schemas/index.ts` (all `tenant_schemas`, empty `control_plane_schemas`), `schemas/` (valibot `Create<Entity>Schema`/`Update<Entity>Schema`/`<Entity>FiltersSchema`; `ViewConditionSchema`/`ViewSortSchema` copied from dms `schemas/file-view.ts` shapes; `WidgetConfigSchema` per §2.2 incl. `WidgetRangeSchema`; `WidgetPlacementSchema`; `ScheduleConfigSchema`), `auth.ts`, `pubsub.ts`, `types.ts`, `index.ts`.
4. `runtime.ts` — config singleton (`setWorkspaceConfig`/`getWorkspaceConfig`, dms pattern) **plus view-resolver registry**: `registerViewResolver(domain, fn)` / `getViewResolver(domain)` where `ViewResolver = (conditions, sort, opts) => Promise<{ rows, total? }>`. `get*` throws when unset; host apps register resolvers at startup.
5. `services/access-service.ts` — `assertCanAccess(row, actorId)` (`access = global OR ownerId === actorId`) + `assertCanMutate(row, actorId)` (ownership or tenant admin), used by all data groups.
6. Gate: `bun install`; `cd packages/workspace && bun run check:lint && bun run check:types && bun run build`.

## 5. Phase 2 — Drafts

1. Workflows (one file per action): `workflows/draft/{create,update,get,list,delete}.ts`, `workflows/draft/{submit,approve,reject,publish,reopen,trash,restore,duplicate}.ts`, `workflows/draft/comment/{add,list,remove}.ts`.
2. Status machine (dms-shaped transition guard): `draft → submitted → approved → published`; `submitted → rejected` (requires `rejectionReason`); `published|rejected → draft` (`reopen`); `draft → published` directly (approval optional). Each transition writes audit + publishes matching event. `draft_published` payload = full row.
3. Access enforcement via `access-service` on every read/mutation; `create` derives `ownerId` from `actorId` (fallback: explicit `ownerId` input), defaults `access = personal`.
4. `.list()` filters: `status`, `targetDomain`, `includeTrashed` (excludes `deletedAt`-set rows by default), `search` (title/body), `limit`/`offset`; access-scoped.
5. Gate: package `check:lint` + `check:types`.

## 6. Phase 3 — Filter Views

1. Workflows: `workflows/view/{create,update,get,list,delete,duplicate,apply}.ts`, `workflows/view/default/set.ts`.
2. `conditions`/`sort`/`groupBy` validated against dms-shaped schemas; `domain` accepted free-form (format-validated against `<module>:<entity>` convention, not whitelisted).
3. `setDefault` clears prior default per `(ownerId, domain)` (mirrors dms `default/set.ts`). `apply` resolves through `getViewResolver(domain)` — throws if no resolver registered for view's domain.
4. `.list()` filters: `domain`, `access`, `isDefault`, `search` (name), `limit`/`offset`.
5. Gate: package `check:lint` + `check:types`.

## 7. Phase 4 — Dashboards, Widgets & Schedules

1. Workflows: `workflows/dashboard/{create,update,get,list,delete,duplicate,export,import}.ts`; `workflows/dashboard/widget/{add,get,list,move,remove,update,refresh}.ts` (subresource folders) composed into top-level `widgets` group in `workflows/index.ts`; `workflows/schedule/{create,update,get,list,delete,pause,resume,mark-run}.ts`.
2. Widget validation per type (§2.2); datasource rule: `metric`/`breakdown`/`list` require `domain` + exactly one of `viewId`/`filter`; `embed` forbids datasource. Widget access inherits from parent dashboard (`access-service` against it).
3. `duplicate`/`export`/`import` copy or serialize dashboard + widgets + layout (new ids on import/duplicate; `import` defaults `access = personal` unless snapshot specifies global).
4. **Schedules (stateful runtime)**: `services/schedule-service.ts` w/ `registerScheduleRunner`/`registerScheduleHandler`/`unregisterScheduleRunner` (dms `registerPurgeSchedule` pattern). `create`/`resume` register pg-boss cron topic `workspace:schedule:<id>` via `pubsub.schedule(cron, topic)`; handler reads schedule + dashboard, publishes `workspace:schedule_due`. `pause`/`delete` unregister. `markRun` records `lastRunAt`/`lastError`. `module.ts` `$initialize({ db, pubsub })` stores `#pubsub`/`#db`; `$prepareRuntime()` registers runner/handler; `$cleanup()` unregisters (mirrors dms).
5. `.list()` filters: `dashboardId` (widgets/schedules), `access`, `search` (name/description), `limit`/`offset`.
6. Gate: package `check:lint` + `check:types`.

## 8. Phase 5 — Workspace Utilities

1. Workflows: `workflows/pin/{create,list,delete}.ts`, `workflows/recent/{list,touch}.ts`, `workflows/watch/{subscribe,unsubscribe,list}.ts`, `workflows/setting/{get,set}.ts`, `workflows/search/quick.ts`.
2. All user-scoped (`userId = actorId` — no access column, no `access-service`; dms `dms_pin`/`dms_setting` precedents). `recent.touch` upserts + bumps `lastAccessedAt` (bounded — keep max N rows per user, e.g. 50). `search.quick` merges access-scoped drafts/views/dashboards (`ilike` on name/title/body; tsvector upgrade optional).
3. `settings.set` validates against `SETTING_KEYS` + per-key value schemas (`home_dashboard` = dashboardId, `default_view.<domain>` = viewId, `default_range` = preset, `timezone` = IANA tz string).
4. Gate: package `check:lint` + `check:types`.

## 9. Phase 6 — Documentation & Verification

1. Write `packages/workspace/docs/` (overview, workflows, access-control, events, db-schemas) via `write-docs` skill.
2. Update `.working-docs/`: new `domain-model/workspace.md` + `bounded-contexts/workspace.md`; `DOMAIN_MODEL.md` inventory row; `CONTEXT.md` language entries (Draft, Approval, Filter View, Dashboard, Widget, Schedule, Pin, Watch, Personal/Global access — disambiguating "workspace" from Tenant/Project per §1.2) + relationship diagram; `AGENTS.md` (fully-implemented list, key dirs, current state).
3. Docs build: `cd docs && bunx fumadocs-mdx` (if needed) then `check:types` + `build`.
4. **Sweep greps return clean**: ten table names, `p.workspace`, `workspace:` topics, **no cross-module imports** of any domain package from `packages/workspace`.
5. **Acceptance**: workspace compiles/lints/builds w/ all ten tables; drafts run full `draft → submitted → approved → published`, `rejected`, `trash`/`restore` lifecycle w/ events + audit; views store/validate/apply/set-default cross-domain filters through resolver registry; dashboards persist layout/datasource configs + duplicate/export/import; schedules fire `workspace:schedule_due` on cron + record `markRun`; pins/recent/search/settings/watches work per-user; personal items invisible to other users, global items org-wide — all driven by user-set `access` field.

## 10. Open Decisions (recommendation first)

- **Draft approval**: optional (current — hosts w/o review step skip `submit`/`approve`) vs mandatory (`publish` requires `approved`). **Recommended: optional.**
- **View `apply` resolver**: host-registered callback registry in `runtime.ts` (current) vs pure host-side reads (`views.get`, no `apply`). **Recommended: registry** — makes filter views usable cross-domain while keeping workspace dependency-free.
- **Scheduled delivery**: workspace only emits `workspace:schedule_due` (current) vs hosts register delivery callback (render + email) in `runtime.ts` alongside view resolvers. **Recommended: event-only**; callbacks couple workspace to rendering concerns.
- **Default-view resolution**: per-`(ownerId, domain)` default (current) vs tenant-wide default for global views. **Recommended: per-owner**; resolution order = personal default → global default → first global view.
- **Domain registry**: free-form `domain` text (current) vs strict pgEnum/whitelist. **Recommended: free-form + documented registry** (Recruiter, hospital, ERP apps must extend w/o platform change).
- **Widget date ranges**: fixed presets + optional custom `from`/`to` (current) vs presets only. **Recommended: both.**
- **Watch → notifications**: workspace persists subscriptions + emits `watch_subscribed`/`watch_unsubscribed` (current) vs future `notifications` module consuming them. **Recommended: persist + emit; notifications module reads table later.**
- **Shared access constant**: keep `WORKSPACE_ACCESS` module-local vs promote `ACCESS_SCOPE` to `@aspen-os/constants` for future modules (eventual dms/tasks boolean migration). **Recommended: module-local for v1**, promote when second consumer appears.
- **Widget layout ownership**: layout placements on dashboard row (current) vs coordinates on widget row. **Recommended: dashboard** — layout is dashboard concern; widgets stay datasource-only.
- **Draft versioning/autosave**: out of scope for v1. **Recommended:** revisit after first host app (Recruiter) exercises drafts.

## 11. Deployment Notes (host app)

`pushSchema` (ADR 0004) adds ten new tables; **nothing to drop or migrate**. Host startup must (1) register view resolvers for every domain it serves (`registerViewResolver`), (2) subscribe to `workspace:schedule_due` (and `workspace:draft_published`) to create target entities + deliver scheduled dashboards. **Pub/sub pitfall**: pg-boss **silently drops** topics w/ no consumer — `schedule_due`/`draft_published` dropped if host doesn't subscribe (health check flags topic). Per-schedule pg-boss cron topics (`workspace:schedule:<id>`) consumed by module's own handler, so only domain events need host consumer.

## 12. Effort Estimate (Relative)

| Area                                            | Complexity      | Notes                                                  |
| ----------------------------------------------- | --------------- | ------------------------------------------------------ |
| Constants + enums + scaffold (10 tables)        | Low             | Standard write-module scaffold + registry              |
| Access-service + personal/global scoping        | Low             | Shared helpers; the one non-trivial rule set           |
| Drafts lifecycle (approval/trash/comments)      | Medium          | Status machine, comments, duplicate                    |
| Filter views + `apply` resolver registry        | Medium          | dms-shaped schemas + host-registered resolvers         |
| Dashboards: duplicate/export/import             | Low–Medium      | Snapshot copy semantics                                |
| Widgets: range + refresh metadata               | Low–Medium      | Config validation + status columns                     |
| Schedules (cron runtime)                        | **Medium–High** | pg-boss cron register/unregister + handler + `markRun` |
| Utilities (pins/recent/search/settings/watches) | Low–Medium      | User-scoped CRUD, dms precedents                       |
| Docs + verification                             | Medium          | New module docs + working-docs + sweeps                |

## 13. Out of Scope

- **No rendering/editing engines** — no rich-text editor, markdown renderer, chart library, iframe sandboxing. Widgets + drafts = stored data; rendering = host app frontend.
- **No analytics execution** — metric/breakdown/list widgets declarative datasource configs; module never queries other modules' tables or computes aggregations. Resolution via host's `apply` resolver.
- **No cross-module entity creation on publish** — host subscribes `workspace:draft_published`, creates target entity.
- **No scheduled rendering/delivery** (PDF render, email/SMS send) — workspace emits `workspace:schedule_due`; host delivers. No `notifications`/`comms` integration.
- **No notifications/announcements/feeds/calendar** — future `notifications`/`comms` modules; workspace only persists watch subscriptions + emits watch events for them to consume.
- **No entity-level notes** — that's `@aspen-os/masters` (`p.masters.notes`, polymorphic); workspace comments = draft-review threads only.
- **No attachment binaries** — drafts hold `metadata` refs; binaries live in dms/storage.
- **No retrofitting** of dms `file_view`/`dms_label`/`dms_pin` or tasks `saved_view`/`task_watcher` onto new access model.
- **No draft versioning/autosave or real-time collaboration**.
- **No app-specific dashboards** (e.g. Recruiter funnel, hospital occupancy board) — workspace stores them; apps build on top.
