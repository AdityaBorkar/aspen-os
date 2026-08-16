# Workspace Domain Model

> Package: `@aspen-os/workspace`. Dependency-free personal-workspace surfaces: **drafts** (saved, unpublished content with an optional approval lifecycle and threaded comments), **filter views** (cross-domain saved filter/sort/group configs applied via a host-registered resolver registry), **dashboards** (named collections of metric/breakdown/list/embed widgets over a grid layout, with optional scheduled delivery), and **utilities** (pins, recent items, quick search, settings, watches). All 10 tables are tenant schemas with the `workspace_` prefix. Every data entity carries a user-set `access` enum — `personal` (owner-only) or `global` (org-wide within the tenant).

## Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                       WORKSPACE DOMAIN                               │
│                                                                      │
│  ┌─────────────────┐   1:N    ┌─────────────────────┐                │
│  │     Draft       │─────────→│   DraftComment      │                │
│  │ id              │          │ draftId (FK)        │                │
│  │ title / body    │          │ authorId / content  │                │
│  │ notes / metadata│          └─────────────────────┘                │
│  │ status (enum:   │                                                 │
│  │  draft/submitted│                                                 │
│  │  approved/      │                                                 │
│  │  rejected/      │                                                 │
│  │  published)     │                                                 │
│  │ access (enum:   │                                                 │
│  │  personal/global│                                                 │
│  │ deletedAt (trash)│                                                │
│  │ targetDomain /  │                                                 │
│  │  targetEntityId │                                                 │
│  └─────────────────┘                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │      View       │  │   Dashboard     │  │    Widget       │        │
│  │ id              │  │ id              │  │ id              │        │
│  │ name / domain   │  │ name / desc     │  │ dashboardId (FK)│        │
│  │ conditions(jsonb)│ │ layout (jsonb:  │  │ type (enum:     │        │
│  │ sort (jsonb)    │  │  {widgetId,x,y, │  │  metric/        │        │
│  │ groupBy         │  │   w,h}[])       │  │  breakdown/     │        │
│  │ isDefault       │  │ access          │  │  list/embed)    │        │
│  │ access          │  │                 │  │ config (jsonb)  │        │
│  └────────┬────────┘  └───────┬─────────┘  │ domain / filter │        │
│           │ N:1 (viewId,     │             │ viewId (FK →    │        │
│           │ datasource reuse) │             │  View, soft)    │        │
│           │                  │ 1:N (dashboardId)              │        │
│           │                  ▼                                │        │
│           │            ┌──────────────┐  ┌──────────────┐      │        │
│           │            │  Schedule    │  │   Widget     │◀─────┘        │
│           │            │ id           │  └──────────────┘                │
│           │            │ dashboardId  │                                 │
│           │            │ cron / config│                                 │
│           │            │ isActive /   │                                 │
│           │            │ lastRunAt    │                                 │
│           │            └──────────────┘                                 │
│           │                                                            │
│  ┌────────┴────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │      Pin        │ │    Recent    │ │    Watch     │ │   Setting    │ │
│  │ userId          │ │ userId       │ │ userId       │ │ userId       │ │
│  │ itemType        │ │ itemType     │ │ itemType     │ │ key (uniq per│ │
│  │ itemId          │ │ itemId       │ │ itemId       │ │  user)       │ │
│  │ sortOrder       │ │ lastAccessed │ │              │ │ value(jsonb) │ │
│  └─────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
│  (itemType+itemId soft-reference any registry item)                     │
└──────────────────────────────────────────────────────────────────────┘
```

## Invariants

1. **Access is user-set** — `personal`/`global` is chosen at create/update time by the user. `personal` rows are visible only to `ownerId`; `global` rows are org-wide within the tenant.
2. **Widgets and schedules inherit dashboard access** — no own access column; access checks resolve through the parent dashboard.
3. **Runtime scoping lives in workflow code** — `services/access-service.ts` (`assertCanAccess` = `global OR owner`; `assertCanMutate` = owner or tenant admin). ACL is the capability matrix; it never encodes visibility.
4. **Draft lifecycle is a guarded status machine** — `draft → submitted → approved → published`, `submitted → rejected` (requires `rejectionReason`), `published|rejected → draft` (`reopen`), `draft → published` directly (approval optional). Transitions are atomic `UPDATE … WHERE status IN (from)` guards. Trash is soft (`deletedAt`).
5. **Approval is optional** — hosts without a review step call `publish` directly from `draft`.
6. **Workspace is dependency-free** — `domain` is opaque free-form text (`<module>:<entity>`); the module never queries other modules' tables. View resolution happens through host-registered resolvers; publish/schedule delivery happens through host-subscribed events.
7. **A widget datasource is `{ domain }` + exactly one of `filter`/`viewId`** — `embed` widgets forbid a datasource. `metric`/`breakdown`/`list` require it.
8. **Widgets are declarative configs** — the module stores and serves them and tracks `lastRefreshedAt`/`lastError`; it never executes analytics.
9. **Utilities are strictly user-scoped** — pins, recent, settings, watches carry no access column; `userId = actorId` at the row level.
10. **Recent items are bounded** — `touch` trims each user's history to `maxRecentItems` (default 50).
11. **Scheduled delivery is event-driven** — the module emits `workspace:schedule_due` (with full schedule + dashboard payload); hosts render and deliver. Per-schedule pg-boss crons (`workspace:schedule:<id>`) are consumed by the module's own handler.
12. **Every `.list()` is access-scoped at SQL level** — `WHERE access = 'global' OR owner_id = actor_id`, plus entity filters (`status`, `domain`, `dashboardId`, `search`).
13. **Pins are the generic cross-module link surface** — `itemType` values come from the documented `PIN_ITEM_TYPE` registry (`draft`/`view`/`dashboard` for workspace entities; `triage`/`file_view`/`class` for dms items), so dms (and any future module) items are pinnable by `(itemType, itemId)` soft reference with **no module dependency**. The pin column is free-form text like `domain`; the registry governs, it is not enforced by a schema.

## Terminology

- **Draft** — a saved, unpublished piece of content (title/body/notes/metadata) with an optional review lifecycle. Not a "draft status" on another module's entity (contrast: compliance `document_status.draft`, hr contracts) — a first-class persistable entity.
- **Approval** — the optional `submit → approve` gate on a draft; hosts skip it by publishing directly.
- **Filter View** — a cross-domain saved `{ domain, conditions, sort, groupBy }` configuration. "Domain" is the dataset key (`<module>:<entity>`); conditions use the dms `FileViewCondition` shape `{ field, operator, value }`.
- **Dashboard** — a named collection of widgets plus a jsonb `layout` (`{ widgetId, x, y, w, h }[]`).
- **Widget** — a declarative datasource config (`metric`/`breakdown`/`list`/`embed`) with runtime refresh metadata. No rendering, no analytics execution.
- **Schedule** — a per-dashboard cron delivery configuration (`{ recipients, format, subject? }`); emits `workspace:schedule_due`, host delivers.
- **Pin** — a user's sidebar shortcut to any tenant item via the `PIN_ITEM_TYPE` registry: workspace entities (`draft`/`view`/`dashboard`) plus dms items (`triage`/`file_view`/`class`), soft-referenced by `(itemType, itemId)` with no module dependency. New modules adopt namespaced strings (`<module>:<entity>`); bare legacy strings stay valid for migrated rows.
- **Watch** — a user's follow-subscription on a view/dashboard (tasks-watcher vocabulary) — distinct from `PubSubUnit.subscribe` (pg-boss).
- **Personal / Global access** — the user-set visibility: `personal` = owner-only, `global` = org-wide within the tenant.
