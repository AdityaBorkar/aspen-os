# Workspace Context

> Package: `@aspen-os/workspace`. Dependency-free personal-workspace module — drafts (optional approval + comments), filter views (cross-domain, applied via host-registered resolver registry), dashboards (widgets + grid layout + schedules), + per-user utilities (pins, recent, quick search, settings, watches). Every entity access user-set to `personal` or `global`.

## Relationship Type

Downstream of Platform (Customer–Supplier). Runtime-wired — gets `{ db, pubsub }` via `$initialize(units)` (stores `#db` + `#pubsub`), registers schedule runner + handler in `$prepareRuntime()`, unregisters in `$cleanup()`. **No module deps** — `domain` opaque, resolution/delivery delegated to host-registered resolvers + host-subscribed events.

## Structure (`packages/workspace/`)

- `Workspace.create(config?)` — factory → Module instance; `$config: Required<WorkspaceModuleConfig>` (2 settings w/ defaults: `maxRecentItems` (50), `quickSearchLimit` (10))
- `$name = "workspace"`, `$dependencies = []` — no module deps
- 10 workflow groups as `readonly` props: `dashboards`, `drafts`, `pins`, `recent`, `schedules`, `search`, `settings`, `views`, `watches`, `widgets`
- 2 services: `access-service` (personal/global scoping), `schedule-service` (cron register/unregister + delivery); 5 reusable `WorkflowStep`s (`fetch-draft`, `fetch-view`, `fetch-dashboard`, `fetch-widget`, `fetch-schedule`)
- 10 tables (all `tenant_schemas`, `workspace_` prefix): `workspace_draft`, `workspace_draft_comment`, `workspace_view`, `workspace_dashboard`, `workspace_widget`, `workspace_schedule`, `workspace_pin`, `workspace_recent`, `workspace_watch`, `workspace_setting`
- 4 pgEnums: `workspace_access`, `workspace_draft_status`, `workspace_widget_type`, `workspace_item_type`
- 32 events across 7 maps (`DRAFT_EVENTS` 13, `VIEW_EVENTS` 4, `DASHBOARD_EVENTS` 6, `WIDGET_EVENTS` 4, `PIN_EVENTS` 2, `WATCH_EVENTS` 2, `SCHEDULE_EVENTS` 1) → `WorkspaceEventMap`
- 11 ACL resources: `draft`, `draftComment`, `filterView`, `dashboard`, `widget`, `schedule`, `pin`, `recent`, `watch`, `setting`, `search`
- `$prepareRuntime()` — `registerScheduleRunner()` enumerates active schedules, registers pg-boss cron per schedule (`workspace:schedule:<id>`); `$cleanup()` unregisters all. No fixed module-level cron (unlike dms expiry/auto-purge)
- Module-scope runtime state in `runtime.ts` (`setWorkspaceConfig`/`getWorkspaceConfig`) **plus view-resolver registry**: `registerViewResolver(domain, fn)` / `getViewResolver(domain)` (throws when unset); hosts register resolvers at startup
- Build step (build script + `build` field in package.json), root `tsconfig.json` reference, `docs/source.config.ts` entry

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

New module — no prior package. `dms`/`tasks` saved views (`dms_file_view`, `task_saved_view`) + `isShared`/`isGlobal` booleans are precedents for access model but **not retrofitted**; workspace introduces first-class `personal`/`global` `access` enum. `dms_setting` precedent for user-scoped utilities; former `dms_pin` surface (sidebar pins for triage/file-view/class items) **consolidated here** — workspace pins = single pin concept (`.working-docs/sow/dms-pins-removal.md`). Compliance's `dashboard` = module-local summary metrics, not generic dashboard entity.

## Language

- Draft, Approval, Filter View, Domain (workspace), Dashboard, Widget, Schedule (workspace), Pin (workspace), Recent, Quick Search, Watch (workspace), Setting (workspace), Personal/Global access
- `workspace` here = **personal-workspace surface** (drafts/views/dashboards/utilities) — not Tenancy, not tasks Project/Board
- `watches.subscribe`/`unsubscribe` = follow-subscriptions on views/dashboards (tasks-watcher vocabulary) — distinct from `PubSubUnit.subscribe`/`unsubscribe` (pg-boss)
- Avoid: Workspace (for Tenant), Board/Project (for tasks), Saved Filter (for Filter View), Analytics/Metric (for Widget), Dashboard (for compliance summary metrics), Notification (for Watch)
