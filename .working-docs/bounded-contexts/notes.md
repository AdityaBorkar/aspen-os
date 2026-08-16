# Notes Context

> Package: `@aspen-os/notes`. Domain module for the first-class **note** entity — `personal`/`global` access, optional polymorphic scope and type. Stateless (tasks/masters pattern); owns one tenant table.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Implements the `Module` interface; no unit dependencies (`$dependencies = []`), stateless (`$initialize`/`$prepareRuntime`/`$cleanup` empty).

## Structure (`packages/notes/`)

- `Notes.create(config?)` — factory returning a Module instance; `$config: NotesModuleConfig = undefined`
- `$name = "notes"`, `$dependencies = []`
- 1 workflow group: `notes` (`create`, `get`, `list`, `update`, `delete`) — stateless `readonly` property
- 1 database table (tenant schema, no prefix): `note`
- 3 domain events published via PubSub (`NotesEventMap`)
- 1 ACL resource: `note`
- Valibot validation schemas for all inputs; `services/access-service.ts` for row-level access enforcement
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally by the platform
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.notes.notes        { create, delete, get, list, update }
```

`create` derives `ownerId` from `actorId` (explicit `ownerId` wins), defaults `access = personal`, validates `type` and the `scopeType` `<module>:<entity>` format. `update`/`delete` are owner/tenant-admin-only (`assertCanMutate`). `.list()` is access-scoped with `scopeType`/`scopeId`, `type`, `tags` (any-match), and `search` (title/body `ilike`) filters. Workflows are one file per action under `workflows/note/<verb>.ts`.

## Cross-context integration

- **Workspace** (docs-level): `notes:note` is a built-in view domain (`VIEW_DOMAIN`); notes are linkable from workspace pins/recent. No code coupling.
- **Masters** (removal): the notes module replaces the `master_note` table / `p.masters.notes` group / `masters:note_added`/`note_removed` events / note ACL resource / note schemas. Scoped annotation notes migrate with `scopeType = masters:<entityType>`, `scopeId = entityId`, `content → body`, `userId → ownerId`.
- **Calendar** (future, docs-level): `calendar_reminder.targetType = note` may target notes.
- **Compliance** (out of scope, docs-level): hosts may link via `scopeType = compliance:document` at their discretion.

## Language

- Note, personal/global access, `(scopeType, scopeId)` scope, NOTE_TYPE, ownerId, assertCanAccess, assertCanMutate
- Avoid: Draft (approval-lifecycle content — that is workspace), Activity/Log Entry, "master note"
