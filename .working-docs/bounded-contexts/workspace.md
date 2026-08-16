# Workspace Context

> Package: `@aspen-os/workspace`. Dependency-free personal-workspace module — drafts (with optional approval + comments), filter views (cross-domain, applied via a host-registered resolver registry), dashboards (widgets + grid layout + schedules), and per-user utilities (pins, recent, quick search, settings, watches). Every entity's access is user-set to `personal` or `global`.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Runtime-wired — receives `{ db, pubsub }` via `$initialize(units)` (stores `#db` + `#pubsub`), registers the schedule runner + handler in `$prepareRuntime()`, unregisters in `$cleanup()`. **No module dependencies** — `domain` is opaque, resolution/delivery is delegated to host-registered resolvers and host-subscribed events.

## Structure (`packages/workspace/`)

- `Workspace.create(config?)` — factory returning a Module instance; `$config: Required<WorkspaceModuleConfig>` (2 settings with defaults: `maxRecentItems` (50), `quickSearchLimit` (10))
- `$name = "workspace"`, `$dependencies = []` — no module deps
- 10 workflow groups exposed as `readonly` properties: `dashboards`, `drafts`, `pins`, `recent`, `schedules`, `search`, `settings`, `views`, `watches`, `widgets`
- 2 services: `access-service` (personal/global scoping), `schedule-service` (cron register/unregister + delivery); 5 reusable `WorkflowStep`s (`fetch-draft`, `fetch-view`, `fetch-dashboard`, `fetch-widget`, `fetch-schedule`)
- 10 database tables (all `tenant_schemas`, `workspace_` prefix): `workspace_draft`, `workspace_draft_comment`, `workspace_view`, `workspace_dashboard`, `workspace_widget`, `workspace_schedule`, `workspace_pin`, `workspace_recent`, `workspace_watch`, `workspace_setting`
- 4 pgEnums: `workspace_access`, `workspace_draft_status`, `workspace_widget_type`, `workspace_item_type`
- 40 domain events across 7 maps (`DRAFT_EVENTS` 13, `VIEW_EVENTS` 4, `DASHBOARD_EVENTS` 6, `WIDGET_EVENTS` 4, `PIN_EVENTS` 2, `WATCH_EVENTS` 2, `SCHEDULE_EVENTS` 1) → `WorkspaceEventMap`
- 12 ACL resources: `draft`, `draftComment`, `filterView`, `dashboard`, `widget`, `schedule`, `pin`, `recent`, `watch`, `setting`, `search`
- `$prepareRuntime()` — `registerScheduleRunner()` enumerates active schedules and registers a pg-boss cron per schedule (`workspace:schedule:<id>`); `$cleanup()` unregisters all. No fixed module-level cron (unlike dms's expiry/auto-purge)
- Module-scope runtime state in `runtime.ts` (`setWorkspaceConfig`/`getWorkspaceConfig`) **plus the view-resolver registry**: `registerViewResolver(domain, fn)` / `getViewResolver(domain)` (throws when unset); hosts register resolvers at startup
- Has a build step (build script + `build` field in package.json), root `tsconfig.json` reference, and a `docs/source.config.ts` entry

## Exposed on the platform instance

```
p.workspace.dashboards { create, delete, duplicate, export, get, import, list, update }
p.workspace.drafts     { addComment, approve, create, delete, duplicate, get, list,
                         listComments, publish, reject, removeComment, reopen, restore,
                         submit, trash, update }
p.workspace.pins       { create, delete, list }
p.workspace.recent     { list, touch }
p.workspace.schedules  { create, delete, get, list, markRun, pause, resume, update }
p.workspace.search     { quick }
p.workspace.settings   { get, set }
p.workspace.views      { apply, create, delete, duplicate, get, list, setDefault, update }
p.workspace.watches    { list, subscribe, unsubscribe }
p.workspace.widgets    { add, get, list, move, refresh, remove, update }
```

## Lineage

New module — no prior package. `dms`/`tasks` saved views (`dms_file_view`, `task_saved_view`) and `isShared`/`isGlobal` booleans are precedents for the access model but are **not retrofitted**; workspace introduces the first-class `personal`/`global` `access` enum. `dms_pin`/`dms_setting` are the precedents for the user-scoped utilities. Compliance's `dashboard` is module-local summary metrics, not a generic dashboard entity.

## Language

- Draft, Approval, Filter View, Domain (workspace), Dashboard, Widget, Schedule (workspace), Pin (workspace), Recent, Quick Search, Watch (workspace), Setting (workspace), Personal/Global access
- `workspace` here means the **personal-workspace surface** (drafts/views/dashboards/utilities) — not Tenancy, and not the tasks Project/Board
- `watches.subscribe`/`unsubscribe` are follow-subscriptions on views/dashboards (tasks-watcher vocabulary) — distinct from `PubSubUnit.subscribe`/`unsubscribe` (pg-boss)
- Avoid: Workspace (for Tenant), Board/Project (for tasks), Saved Filter (for Filter View), Analytics/Metric (for Widget), Dashboard (for compliance's summary metrics), Notification (for Watch)
