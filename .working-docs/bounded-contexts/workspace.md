# Workspace Context

> Package: `@aspen-os/workspace`. Dependency-free personal-workspace module — drafts (optional approval + comments), dashboards (widgets + grid layout + schedules), + per-user utilities (pins, recent, quick search), plus the cross-domain filter view store. Every entity access user-set to `personal` or `global`. Settings moved to `@aspen-os/masters` (`p.masters.settings`).

## Relationship Type

Downstream of Platform (Customer–Supplier). Runtime-wired — gets `{ db, pubsub }` via `$initialize(units)` (stores `#db` + `#pubsub`), registers schedule runner + handler in `$prepareRuntime()`, unregisters in `$cleanup()`. **No module deps** — `domain` opaque, resolution/delivery delegated to host-registered resolvers + host-subscribed events.

## Structure (`packages/workspace/`)

- `Workspace.create(config?)` — factory → Module instance; `$config: Required<WorkspaceModuleConfig>` (2 settings w/ defaults: `maxRecentItems` (50), `quickSearchLimit` (10))
- `$name = "workspace"`, `$dependencies = []` — no module deps
- 8 workflow groups as `readonly` props: `dashboards`, `drafts`, `filterViews`, `pins`, `recent`, `schedules`, `search`, `widgets`
- 2 services: `access-service` (personal/global scoping), `schedule-service` (cron register/unregister + delivery); 6 reusable `WorkflowStep`s (`fetch-draft`, `fetch-dashboard`, `fetch-widget`, `fetch-schedule`, `fetch-filter-view`, `filter-view-access`)
- 8 tables (all `tenant_schemas`, `workspace_` prefix): `workspace_draft`, `workspace_draft_comment`, `workspace_dashboard`, `workspace_widget`, `workspace_delivery_schedule`, `workspace_pin`, `workspace_recent`, `workspace_filter_view`
- 6 pgEnums: `workspace_access`, `workspace_draft_status`, `workspace_widget_type`, `workspace_item_type`, `workspace_filter_view_access`, `workspace_filter_view_type`
- 29 events across 6 maps (`DRAFT_EVENTS` 13, `DASHBOARD_EVENTS` 6, `WIDGET_EVENTS` 4, `PIN_EVENTS` 2, `FILTER_VIEW_EVENTS` 4, `DELIVERY_SCHEDULE_EVENTS` 1) → `WorkspaceEventMap`
- 9 ACL resources: `draft`, `draftComment`, `dashboard`, `widget`, `filterView`, `schedule`, `pin`, `recent`, `search`
- `$prepareRuntime()` — `registerScheduleRunner()` enumerates active schedules, registers pg-boss cron per schedule (`workspace:delivery_schedule:<id>`); `$cleanup()` unregisters all. No fixed module-level cron (unlike dms expiry/auto-purge)
- Module-scope runtime state in `runtime.ts` (`setWorkspaceConfig`/`getWorkspaceConfig`)
- Build step (build script + `build` field in package.json), root `tsconfig.json` reference, `docs/source.config.ts` entry

## Exposed on the platform instance

```
p.workspace.dashboards  { create, delete, duplicate, export, get, import, list, update }
p.workspace.drafts      { addComment, approve, create, delete, duplicate, get, list,
                          listComments, publish, reject, removeComment, reopen, restore,
                          submit, trash, update }
p.workspace.filterViews { create, delete, duplicate, get, getDefault, list, setDefault, update }
p.workspace.pins        { create, delete, list }
p.workspace.recent      { list, touch }
p.workspace.schedules   { create, delete, get, list, markRun, pause, resume, update }
p.workspace.search      { quick }
p.workspace.widgets     { add, get, list, move, refresh, remove, update }
```

## Lineage

New module — no prior package. `dms`/`tasks` saved views (`dms_file_view`, `task_saved_view`) + `isShared`/`isGlobal` booleans are precedents for access model but **not retrofitted**; workspace introduces first-class `personal`/`global` `access` enum. `dms_setting` precedent for user-scoped utilities; former `dms_pin` surface (sidebar pins for triage/file-view/class items) **consolidated here** — workspace pins = single pin concept (`.working-docs/sow/dms-pins-removal.md`). Filter views (`workspace_filter_view`, consolidated from tasks saved views, DMS file views, and the former `workspace_view`) are the single cross-domain saved-filter store (`workspace:filter_view`); widget `viewId` is a same-module soft FK. Settings (`workspace_setting`) later **moved out** to `@aspen-os/masters` as `master_setting` (key-prefixed scope: `org.*` tenant-wide, all other keys per-user). Compliance's `dashboard` = module-local summary metrics, not generic dashboard entity.

## Language

- Draft, Approval, Domain (workspace), Dashboard, Widget, Filter View, Schedule (workspace), Pin (workspace), Recent, Quick Search, Personal/Global access
- `workspace` here = **personal-workspace surface** (drafts/dashboards/filter-views/utilities) — not Tenancy, not tasks Project/Board
- Avoid: Workspace (for Tenant), Board/Project (for tasks), Saved Filter (for Filter View outside workspace), Analytics/Metric (for Widget), Dashboard (for compliance summary metrics)
