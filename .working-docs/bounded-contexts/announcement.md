# Announcement Context

> Package: `@aspen-os/announcement`. Domain module for company broadcasts — authoring, audience targeting, scheduling, publishing, delivery snapshots.

## Relationship Type

Downstream of Platform (Customer–Supplier) and of `@aspen-os/hr-core` (audience resolution). Fully conformant — `implements Module`, follows one-file-per-action workflow layout. Stateless — `$initialize()`/`$prepareRuntime()`/`$cleanup()` are empty (no schedules, no subscriptions).

## Structure (`packages/announcement/`)

- `Announcement.create(config)` — factory returning Module instance; `$config: AnnouncementModuleConfig = { country: "INDIA" }`
- `$name = "announcement"`, `$dependencies = ["hrCore"]`
- 1 workflow group exposed as `readonly` property: `announcement` — 14 methods across per-action workflow files composed into `workflows/index.ts` router (shared helpers in `workflows/trees.ts` + `workflows/utils.ts`)
- 2 database tables, all tenant (`announcement`, `announcement_recipient`); `control_plane_schemas` is empty
- 6 domain events in 1 group (`AnnouncementEventMap`) → `announcement.*`
- 1 ACL resource: `announcement`
- `$prepareRuntime()` — no cron schedules, no subscriptions; `$cleanup()` empty

## Exposed on the platform instance

```
p.announcement.announcement internal communications — author, schedule, publish, archive, pin, audience
                             targeting, delivery snapshot + stats (14 methods)
```

## Cross-context integration

- Comms' EventBridge subscribes to `announcement.published` (one `comms_notification` per auth-user recipient with `sourceModule: "announcement"`, `sourceEntity.type: "announcement"`); announcement's `getStats` reads read/acknowledgement counts back from those `comms_notification` rows (narrow, directed cross-module read for stats only).
- Audience resolution reads hr-core's `employee` + `hr_user` tables via raw SQL at publish time (no table imports — hr-core is raw-src with package-local `#/*` alias, so dependency stays one-directional).

## Language

- Announcement, Announcement Audience, Delivery Snapshot, AnnouncementModuleConfig
- Avoid: Notification (for Announcement — Notification stays comms term)
