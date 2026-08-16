# `@aspen-os/notes` Module — Notes + Masters Note Removal (Scope of Work)

> SOW: create new `notes` module owning single first-class **note** entity — `personal`/`global` access, optional polymorphic scope + type — and **remove note concept from `@aspen-os/masters`** (`master_note` table, `p.masters.notes` group, `masters:note_added`/`note_removed` events, note ACL resource, note schemas).

> **Status — as of Aug 2026:** **Complete.** Phases 0–4 done. `@aspen-os/notes` implemented (note entity + access-service + one workflow per verb), masters note concept removed (`master_note` → `note`; masters back to 7 tables), docs + domain records updated, all gates green. Hosts migrate `master_note` rows + `DROP TABLE master_note` (pushSchema never drops it).

## Confirmed Decisions

| #   | Decision        | Outcome                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Module identity | `@aspen-os/notes`, module `$name = "notes"` (proxy `p.notes`), build-step package w/ `build` config block, root `tsconfig.json` reference, `docs/source.config.ts` entry. `$dependencies = []`. **Stateless** (`$initialize`/`$prepareRuntime`/`$cleanup` empty — tasks/masters pattern).                                                |
| 2   | Note entity     | One table `note`: optional `title`, `body`, `metadata`, `access` (`personal`/`global`), `ownerId`, `tags text[]`, optional polymorphic scope `(scopeType, scopeId)`, `type` (`NOTE_TYPE`). Polymorphic scope preserves masters annotation use-case (contact/entity/connection notes) — removing masters notes **not** domain regression. |
| 3   | Access model    | `personal` / `global` (workspace vocabulary), enforced via small `services/access-service.ts` (`assertCanAccess` = `global OR ownerId === actorId`; `assertCanMutate` = owner or tenant admin). Same access/ACL split as dms/workspace/calendar.                                                                                         |
| 4   | Shared constant | `NOTE_TYPE` **stays** in `@aspen-os/constants` (already shared). Notes module consumes it; masters drops local `master_note_type` pgEnum.                                                                                                                                                                                                |
| 5   | Masters removal | Delete `master_note` (8 → 7 tables), `workflows/note/*` + `p.masters.notes` group, `NOTE_EVENTS` (`masters:note_added`/`note_removed`), `note` ACL resource, note schemas/types/audit constants. grep-verified: no in-repo consumers.                                                                                                    |
| 6   | Continuity      | Hosts mapping masters notes → notes rows set `scopeType` per documented `<module>:<entity>` registry (e.g. `masters:contact`, `masters:entity`), `scopeId` = old `entityId`.                                                                                                                                                             |
| 7   | Module surface  | `p.notes.notes { create, delete, get, list, update }`.                                                                                                                                                                                                                                                                                   |
| 8   | Events          | `notes:note_created` / `notes:note_updated` / `notes:note_deleted` replace `masters:note_added`/`note_removed`.                                                                                                                                                                                                                          |
| 9   | Integration     | Docs-level only: `notes:note` documented built-in view domain (workspace); notes linkable from workspace pins/recent; calendar reminders can target notes (`calendar_reminder.targetType = note`). No code coupling.                                                                                                                     |
| 10  | Tags            | `tags text[]` on note; no separate tag/folder entity in v1.                                                                                                                                                                                                                                                                              |

---

## 1. Current State & Inventory

### 1.1 Masters notes today

- **Table** `master_note` (tenant schema, `master_` prefix): `content`, `type` (`master_note_type`, values from shared `NOTE_TYPE`), `entityType` (`master_entity_type`), `entityId`, `userId` — polymorphic annotation on masters owners (organization/branch/connection/contact/entity).
- **Surface** `p.masters.notes` (`workflows/note/{add,remove,list}.ts`); **events** `NOTE_EVENTS` in `pubsub.ts`; **ACL** `note: ["create","delete","read"]` in `auth.ts`; **schemas** `schemas/note.ts` (`CreateNoteSchema`/`ListNotesSchema`) + re-exports in `schemas/index.ts`/`types.ts`; **enum** `masterNoteTypeEnum` in `db-schemas/enums.ts`.
- **grep-verified**: `master_note`, `NOTE_EVENTS`, `masters:note_added/removed`, `p.masters.notes` referenced **only inside `packages/masters`**. Clean for in-repo removal; host migration §5.

### 1.2 Overlap & terminology

- workspace `Draft` **not** a note (approval-lifecycle content) — kept distinct; domain-language entry must say so.
- masters `master_note` (business-entity annotation) vs notes-module note (first-class personal note) — `scopeType`/`scopeId` preserves annotation use-case.
- Names free: no `note` table in repo (masters uses `master_note`), no `notes:*` topics, no `p.notes` accessor, `notes_access`/`notes_note_type` pgEnum names unused.

## 2. Target Model

### 2.1 Table `note` (tenant schema, `uuidv7` PK, timestamptz `createdAt`/`updatedAt`)

| Column      | Type                   | Notes                                                                                 |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `access`    | enum `notes_access`    | `personal`/`global`, default `personal`                                               |
| `body`      | text (notNull)         | markdown/text                                                                         |
| `id`        | text PK `uuidv7`       |                                                                                       |
| `metadata`  | jsonb default `{}`     | opaque — attachment refs, structured fields                                           |
| `ownerId`   | text (notNull)         | soft FK → better-auth `user`                                                          |
| `scopeId`   | text (nullable)        | entity id for scoped/annotation notes                                                 |
| `scopeType` | text (nullable)        | `<module>:<entity>` registry (e.g. `masters:contact`, `tasks:task`, `calendar:event`) |
| `tags`      | text[] default `[]`    |                                                                                       |
| `title`     | text (nullable)        | quick-capture allows untitled                                                         |
| `type`      | enum `notes_note_type` | values from shared `NOTE_TYPE`, default `general`                                     |

Indexes: `(ownerId)`, `(access)`, `(scopeType, scopeId)`.

**pgEnums** (`db-schemas/enums.ts`): `notes_access` (`personal`/`global`), `notes_note_type` (`NOTE_TYPE` values).

### 2.2 Module surface (`p.notes.notes`)

```
p.notes.notes { create, delete, get, list, update }
```

- `create` derives `ownerId` from `actorId` (fallback: explicit input), defaults `access = personal`, validates `type` + `scopeType` format.
- `update` owner/admin-only (`assertCanMutate`); `access` changes allowed to owner or tenant admin.
- `.list()` filters: access-scoped default (`access = 'global' OR ownerId = actorId`), `scopeType`/`scopeId`, `type`, `tags` (any match), `search` (title/body `ilike`), `limit`/`offset`.

### 2.3 Events (`notes:*`)

- `note_created` / `note_updated` / `note_deleted` — payloads `{ note: { id, title, body, type, access, scopeType?, scopeId? } }` (+ `changes` for updated). Replace masters note events.

### 2.4 ACL

```ts
defineAcl({ note: ["create", "read", "update", "delete"] });
```

### 2.5 Masters after removal (7 tables, 7 groups)

Tables: `master_contact`, `master_address`, `master_bank_account`, `master_connection`, `master_entity`, `master_payment_method`, `master_unit_of_measure`. Groups: `addresses`, `bankAccounts`, `contacts`, `connections`, `entities`, `paymentMethods`, `unitsOfMeasure`. `master_entity_type` unchanged. Events 16 → 14. `NOTE_TYPE` stays in `@aspen-os/constants` (unused by masters).

---

## 3. Phases

### Phase 0 — Constants & Enums

1. `utils/constants.ts`: `NOTES_ACCESS` (`PERSONAL`/`GLOBAL`), `AUDIT_ACTION`/`AUDIT_ENTITY_TYPE` literals (`"notes:note"`-style) for `ctx.audit.write(...)`; reference shared `NOTE_TYPE` from `@aspen-os/constants`.
2. `db-schemas/enums.ts`: `notes_access`, `notes_note_type` (values referencing shared `NOTE_TYPE` constant).
3. Re-run §1.2 baseline greps — `note` table name, `notes:*` topics, `p.notes` clean.
4. Gate: package `check:types` + `check:lint` (Phase 0 files land in Phase 1 scaffold).

### Phase 1 — Scaffold `packages/notes`

1. Load `write-module` skill; scaffold `packages/notes` on masters template (build step + `build` config block, stateless).
2. Add root `tsconfig.json` references + `docs/source.config.ts` (notes docs source).
3. Implement table, `db-schemas/index.ts` (all `tenant_schemas`, empty `control_plane_schemas`), `schemas/` (`CreateNoteSchema`/`UpdateNoteSchema`/`NoteFiltersSchema`), `auth.ts`, `pubsub.ts`, `types.ts`.
4. Gate: `bun install`; package `check:lint` + `check:types` + `build`.

### Phase 2 — Note workflows

1. Workflows: `workflows/note/{create,update,get,list,delete}.ts`; `services/access-service.ts` (dms/workspace split).
2. `.list()` per §2.2; audit writes + event publications per action (`note_created`/`note_updated`/`note_deleted`).
3. Gate: package `check:lint` + `check:types`.

### Phase 3 — Remove note from masters

1. Delete `src/db-schemas/note.ts`; remove `masterNoteTypeEnum` from `db-schemas/enums.ts`; remove `note` export from `db-schemas/index.ts` (tenant_schemas 8 → 7).
2. Delete `src/workflows/note/` + `src/schemas/note.ts`; drop `notes` from `workflows/index.ts` + `module.ts`; drop `NOTE_EVENTS` + `NoteAddedEvent`/`NoteRemovedEvent`/`NoteEventMap` from `pubsub.ts`; drop `note` resource from `auth.ts`; drop note re-exports from `types.ts`/`schemas/index.ts`; remove `AUDIT_ENTITY_TYPE.NOTE` if unused.
3. Gate: root `bun run check:lint` && `check:types`; `cd packages/masters && check:lint && check:types && build`; `cd packages/notes && check:lint && check:types && build`.

### Phase 4 — Documentation & Verification

1. Write `packages/notes/docs/` (overview, workflows, access-control, events, db-schemas) via `write-docs` skill.
2. `.working-docs/`: new `domain-model/notes.md` + `bounded-contexts/notes.md`; trim `domain-model/masters.md` + `bounded-contexts/masters.md` (drop notes; 8 → 7 tables); `BOUNDED_CONTEXTS.md` context-map table (Masters row + new Notes row); `CONTEXT.md` (Note entry — disambiguated from Draft; masters Note entry removed); `AGENTS.md` (fully-implemented list, key dirs, current state — masters drops notes, notes added).
3. Workspace docs: add `notes:note` to built-in view-domains registry.
4. Docs build: `cd docs && bunx fumadocs-mdx` (if needed) then `check:types` + `build`.
5. **Sweep greps return clean**: inside `packages/masters` — `master_note`, `masterNote`, `NOTE_EVENTS`, `noteAdded`, `NoteTypeSchema` (if unused elsewhere), `workflows/note`, `notes` group; repo-wide — `masters:note_added`, `masters:note_removed`, `p.masters.notes`.
6. **Acceptance**: notes compiles/lints/builds; note CRUD w/ `personal`/`global` scoping + scoped annotation notes (`scopeType`/`scopeId`); `notes:note_*` events fire; masters compiles/lints/builds w/ zero note references; docs updated.

## 4. Open Decisions (recommendation first)

- **`scopeType`**: free-form documented `<module>:<entity>` text (**Recommended** — notes outlive masters: `tasks:task`, `calendar:event`, `dms:file`) vs pgEnum (masters precedent; brittle across modules).
- **Tags**: `tags text[]` (**Recommended**, v1) vs `note_tag` entity.
- **Title**: optional (**Recommended** — quick capture) vs required.
- **Migration**: map `master_note` rows to `note` w/ `scopeType = masters:<entityType>` (**Recommended** — preserves annotations) vs drop-only.
- **Access**: `personal`/`global` (**Recommended**, workspace/calendar vocabulary) vs owner-only.
- **Search**: `ilike` on title/body (**Recommended**, v1) vs tsvector full-text.

## 5. Deployment Notes (host app)

- `pushSchema` adds `note` table; **never drops** `master_note`. Host must `DROP TABLE master_note` **after** migrating rows to `note` (map `entityType → scopeType` per registry, `entityId → scopeId`, `content → body`, keep `type`, `userId → ownerId`).
- Hosts calling `p.masters.notes.*` migrate to `p.notes.notes.*` (scoped annotations pass `scopeType`/`scopeId`). No pubsub subscriber changes (no in-repo subscribers to masters note topics).
- `notes:note_*` need host subscriber only if host consumes them (pg-boss silently drops unsubscribed topics; health check flags only topics actually published).

## 6. Effort Estimate (Relative)

| Area                                   | Complexity | Notes                                        |
| -------------------------------------- | ---------- | -------------------------------------------- |
| Constants + enums + scaffold (1 table) | Low        | Standard write-module scaffold               |
| Note workflows + access-service        | Low        | CRUD + filters, dms/workspace precedent      |
| Masters note removal                   | Low–Medium | Delete table/group/events/acl/schemas + docs |
| Docs + verification                    | Low–Medium | New notes docs, trim masters docs, sweeps    |

## 7. Out of Scope

- **No attachments/rich text/versioning/autosave/collaboration** — notes hold `body` + `metadata` refs only.
- **No notebooks/folders hierarchy** — tags only in v1.
- **No retrofitting** of dms/tasks saved-view or label access booleans.
- **No compliance document notes rework** — hosts may link via `scopeType = compliance:document` at discretion.
- **No shared `ACCESS_SCOPE` promotion** — `notes_access` stays module-local (see calendar SOW; revisit when >1 module wants shared enum).
