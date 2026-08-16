# DMS Domain Model

> Package: `@aspen-os/dms`. Unified document management on a **single `file` entity** that carries both filesystem attributes (`folderId`, `path`, `description`) and records attributes (`classId`, `docNumber`, `fieldValues`, `expiryDate`, `batchId`, `compression`). All 14 tables are tenant schemas with the `dms_` prefix.

## Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                       DMS DOMAIN                                      │
│                                                                      │
│  ┌─────────────────┐   1:N    ┌─────────────────────┐                │
│  │      File       │─────────→│    FileVersion      │                │
│  │ id              │          │ fileId (FK)         │                │
│  │ status (enum:   │          │ version             │                │
│  │  triaged/active/│          │ storageKey          │                │
│  │  expired/trashed)│         │ size / etag / name  │                │
│  │ version         │          │ isCurrent           │                │
│  │ folderId / path │          └─────────────────────┘                │
│  │ classId (soft   │                                                 │
│  │  FK → Class)    │                                                 │
│  │ fieldValues     │                                                 │
│  │ expiryDate      │                                                 │
│  │ storageKey      │                                                 │
│  │ docNumber       │                                                 │
│  │ batchId         │                                                 │
│  └───────┬─────────┘                                                 │
│          │ N:1                                                       │
│          ▼                                                           │
│  ┌─────────────────┐   1:N    ┌─────────────────────┐                │
│  │      Class      │─────────→│    ClassField       │                │
│  │ id              │          │ classId (FK)        │                │
│  │ name            │          │ name/label          │                │
│  │ retentionDays   │          │ type (enum, 11)     │                │
│  │ fileNamingSchema│          │ isRequired/default  │                │
│  │ isActive        │          │ options / sortOrder │                │
│  │ (archived, not  │          │ includeInSearch     │                │
│  │  hard-deleted)  │          └─────────────────────┘                │
│  └─────────────────┘                                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Folder     │──self── parentId │  │   Label      │                │
│  │ id           │  (path          │  │ id           │                │
│  │ name         │   materialized) │  │ name / color │                │
│  │ path (uniq)  │──1:N──┌──────────────┐  │ isGlobal     │                │
│  │ isTrashed    │       │  File        │  │ ownerId      │                │
│  └──────────────┘       │ (folderId ⇒  │  └──────┬───────┘                │
│  ┌──────────────┐       │  active)     │         │ N:M via               │
│  │ EntityLabel  │       └──────────────┘         │ dms_entity_label      │
│  │ entityId     │                                │ (entityType: file|    │
│  │ entityType   │                                │  folder)              │
│  │ labelId (FK) │                                ▼                      │
│  └──────────────┘                        ┌──────────────┐                │
│  ┌──────────────┐                        │   Contact    │                │
│  │ FileView     │                        │ firstName /  │                │
│  │ id           │                        │ lastName /   │                │
│  │ name / filters(jsonb) │               │ email / phone│                │
│  │ sort (jsonb) │                        │ company /    │                │
│  │ isShared / isDefault │                │ designation  │                │
│  │ ownerId      │                        │ linkedUserId │                │
│  └──────────────┘                        └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │   Setting    │  │  LegalHold   │  │              │                     │
│  │ key (uniq)   │  │ fileId       │  │              │                     │
│  │ value (jsonb)│  │ reason       │  │              │                     │
│  │              │  │ placedBy /   │  │              │                     │
│  │              │  │ releasedBy   │  │              │                     │
│  │              │  └──────────────┘  │              │                     │
│  └──────────────┘                    │              │                     │
│                                      └──────────────┘                     │
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │    Share     │    │ PublicLink   │    │ AccessLog    │  (file or       │
│  │ entityId     │    │ entityId     │    │ entityId     │   folder        │
│  │ entityType   │    │ entityType   │    │ entityType   │   entity)       │
│  │ granteeId    │    │ token (uniq) │    │ accessedBy / │                 │
│  │ granteeType  │    │ permission   │    │ action / ip  │                 │
│  │ (user/group/ │    │ (view/edit)  │    │ userAgent /  │                 │
│  │  contact)    │    │ password /   │    │ publicLinkId │                 │
│  │ permission   │    │ maxViews /   │    └──────────────┘                 │
│  │ (viewer/     │    │ viewCount /  │                                      │
│  │  editor/     │    │ expiresAt    │                                      │
│  │  owner)      │    └──────────────┘                                      │
│  │ expiresAt /  │                                                          │
│  │ shareToken   │                                                          │
│  └──────────────┘                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Aggregates

### File (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)` — the `uuidv7` JS function)

**Value objects**:

- `FileStatus` — enum: `triaged`, `active`, `expired`, `trashed`
- `FieldType` — enum: text, number, date, select, multi-select, boolean, user, contact, url, email, phone
- `GranteeType` — enum: user, group, contact
- `SharePermission` — enum: viewer, editor, owner
- `PublicLinkPermission` — enum: view, edit
- `EntityType` — enum: file, folder

**Invariants**:

- One uploaded binary carrying both filesystem (`folderId`, `path`) and records (`classId`, `docNumber`, `fieldValues`, `expiryDate`, `batchId`, `compression`) attributes
- Uploads **into a folder** are `active` immediately; uploads **without a folder** are staged as `triaged`
- A triaged file is not searchable, normally listable, or shareable — the only exit is `classify()` (→ `active`)
- `classify` validates the class's required fields, optionally applies the class file-naming schema, assigns the `docNumber`, and sets status `active`
- Storage keys are version-bound: `dms/{tenant}/{fileId}/v{n}/{name}` — `newVersion` writes a fresh object; renames/moves are metadata-only (never an S3 move)
- Pruning retains `maxVersions` (default 10); skipped while a Legal Hold is active
- Permanent deletion is **admin-only** and blocked by an active Legal Hold

**Lifecycle commands** (via `p.dms.files`, `p.dms.triage`, `p.dms.versions`, `p.dms.holds`):

- `upload(input)` / `uploadBulk(input)` → File (in-folder ⇒ `active`, otherwise `triaged`)
- `triage.classify(id, { classId, fieldValues })` → File (→ `active`; the one and only way out of Triage)
- `update(id, patch)` / `rename(id, { name })` / `move(id, folderId)` / `copy(id, folderId)` / `delete(id)` (→ `trashed`) / `restore(id)` / `purge(id)`
- `addMetadata` / `removeMetadata`
- `version.new(id, input)` → FileVersion / `version.revert(id, versionId)` / `version.delete` / `version.getCurrent` / `version.list`
- `holds.place(id, { reason })` (mandatory reason) / `holds.release(id)` / `holds.list`
- `download(id)` / `getDownloadLink(id)`

**Relationships**: Optionally belongs to `Folder` (N:1, via `folderId` — soft FK); optionally belongs to `Class` (N:1, via `classId` — soft FK); has many `FileVersion` (1:N); may have a `LegalHold` (1:N over time); shares/public links/access-log polymorphic on `entityType`; labels via `dms_entity_label`; activity projected from the platform `audit_log` (not a DMS-owned table).

### Class (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- Admin-defined template with typed fields (some required) that a File must satisfy to become active in that class
- Superseded classes are archived (`isActive = false`), not hard-deleted
- Optional file-naming schema with field/date/sequence placeholders (`fileNamingSchema`)
- Optional per-class retention period (`retentionDays`) overriding the settings default

**Lifecycle commands** (via `p.dms.classes`): `create(input)`, `get(id)`, `list(filters?)`, `update(id, patch)`, `archive(id)`, `addField(input)`, `updateField(id, patch)`, `deactivateField(id)`.

**Relationships**: Has many `ClassField` (1:N); has many `File` (1:N, soft FK).

### Class Field (Entity)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: `name` unique per class; typed via `FieldType`; `isRequired` enforced by `classify`; `options` for select/multi-select; `includeInSearch` gates the GIN search index; field values stored as jsonb on the File.

### Folder (Aggregate Root)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- `path` must be unique (hierarchical, e.g. `/Projects/2024`); materialized with depth limit `maxNestingDepth` (default 20) and cycle-safe moves
- `isTrashed` is a soft-delete flag; trashed folders are purged after `trashRetentionDays` (default 30) via the `dms:auto-purge` cron
- Name uniqueness within parent (case-insensitive)

**Lifecycle commands** (via `p.dms.folders`, `p.dms.paths`): `create(input)`, `rename(id, { name })`, `move(id, folderId)`, `update(id, patch)`, `get(id)`, `getById(id)`, `list(filters?)`, `restore(id)`, `delete(id)` (→ trashed).

**Relationships**: Self-referential `parentId` for hierarchy; has many `File` (1:N).

### Share (DMS) (Entity)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**:

- Permission grant (`viewer`/`editor`/`owner`) on a File or Folder to a grantee — a **Contact** (token-based, no login required), an internal **User**, or a **Group**
- Unique per `(entityType, entityId, granteeType, granteeId)` — one grant per grantee per entity
- Revoking, or removing the contact, invalidates access immediately
- Folder grants inherit down the folder tree

**Lifecycle commands** (via `p.dms.shares`): `create(input)`, `update(id, patch)`, `remove(id)`, `get(id)`, `list(filters?)`, `listByGrantee(granteeType, granteeId)`, `listSharedWithMe(userId)`, `resolveToken(token)`.

### Public Link (DMS) (Entity)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Token-based shareable link (`view`/`edit` permission, optional bcrypt `password`, optional `maxViews`/`expiresAt`); `token` unique; `viewCount` incremented per access; access logged to `dms_access_log`. Managed by the same `shares` group as grants.

**Lifecycle commands** (via `p.dms.shares`): `createPublicLink(input)`, `updatePublicLink(id, patch)`, `revokePublicLink(id)`, `resolvePublicLink(token)`, `getPublicLink(id)`, `listPublicLinks(filters?)`.

### Legal Hold (Entity)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: Admin-placed flag with mandatory `reason`; blocks permanent deletion and auto-purge of a File and stops version pruning; released only by an admin.

### Label (DMS) (Entity)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: `isGlobal` labels have `ownerId = null`; non-global labels are owner-scoped. Applied to Files and Folders through the polymorphic `dms_entity_label` join — a file/folder can carry multiple labels; upload accepts `labelIds`.

**Lifecycle commands** (via `p.dms.labels`): `create(input)`, `update(id, patch)`, `delete(id)`, `apply(input)`, `remove(entityId, entityType, labelId)`, `list(opts?)`, `listByLabel(labelId, opts?)`.

### File View (Entity)

**Identity**: `id` (text, UUID, default `$defaultFn(uuidv7)`)

**Invariants**: A saved, reusable filter+sort configuration over active files. Conditions cover file-level columns, classes, class fields (`classField:<name>`), labels, and a free-text `search` term. Personal views are user-owned; admins publish shared views (`isShared`). One default view per owner.

**Lifecycle commands** (via `p.dms.fileViews`): `create(input)`, `update(id, patch)`, `delete(id)`, `apply(id)`, `setDefault(id)`, `getDefault()`, `list(filters?)`, `listByOwner(userId)`.

### Supporting entities

- **Setting**: `{ key (unique), value (jsonb) }` — DMS-wide settings (e.g. default retention).
- **Access Log**: append-only `{ entityId, entityType, accessedBy?, action, ip?, userAgent?, publicLinkId? }` — public-link access and download tracking.
- **Contact**: org-wide address-book entry (`firstName`, `lastName`, `email`, `phone`, `companyName`, `designation` — all mandatory) used as a sharing handle for external parties; may be linked to an internal AuthUnit user (`linkedUserId`). Removal requires a mandatory reason (`deletionReason`) and revokes all shares granted to the contact.
- **Activity Feed**: per-entity chronological trail of DMS actions (upload, classify, version, share, delete, expire, restore, purge, hold) projected from the platform AuditUnit's `audit_log` — not a DMS-owned table, not PubSub events.

## Domain Events — 33 (7 maps → `DmsEventMap`)

### File Events (`FILE_EVENTS`) — 13

| Event                       | Payload                                            | Trigger                            |
| --------------------------- | -------------------------------------------------- | ---------------------------------- |
| `dms:file_uploaded`         | `{ fileId, batchId?, contentType, size, version }` | File uploaded (active or triaged)  |
| `dms:file_classified`       | `{ fileId, classId, docNumber }`                   | File classified (→ active)         |
| `dms:file_updated`          | `{ fileId, changes }`                              | File updated                       |
| `dms:file_downloaded`       | `{ file, userId }`                                 | File downloaded                    |
| `dms:file_moved`            | `{ file, oldPath?, newPath? }`                     | File moved                         |
| `dms:file_trashed`          | `{ fileId, deletedBy }`                            | File moved to trash                |
| `dms:file_restored`         | `{ fileId }`                                       | File restored from trash           |
| `dms:file_expired`          | `{ fileId, expiryDate }`                           | Expiry scanner promoted to expired |
| `dms:file_purged`           | `{ fileId, storageKey }`                           | File permanently purged            |
| `dms:file_version_added`    | `{ fileId, version }`                              | New version written                |
| `dms:file_version_reverted` | `{ fileId, version }`                              | Version reverted                   |
| `dms:file_hold_placed`      | `{ fileId, reason }`                               | Legal hold placed                  |
| `dms:file_hold_released`    | `{ fileId, reason }`                               | Legal hold released                |

### Folder Events (`FOLDER_EVENTS`) — 6

| Event                 | Payload                        | Trigger                    |
| --------------------- | ------------------------------ | -------------------------- |
| `dms:folder_created`  | `{ folder }`                   | Folder created             |
| `dms:folder_renamed`  | `{ folder, oldName }`          | Folder renamed             |
| `dms:folder_moved`    | `{ folder, oldPath, newPath }` | Folder moved               |
| `dms:folder_trashed`  | `{ folderId }`                 | Folder moved to trash      |
| `dms:folder_restored` | `{ folderId }`                 | Folder restored from trash |
| `dms:folder_purged`   | `{ folderId }`                 | Folder permanently purged  |

### Class Events (`CLASS_EVENTS`) — 3

| Event                | Payload       | Trigger        |
| -------------------- | ------------- | -------------- |
| `dms:class_created`  | `{ classId }` | Class created  |
| `dms:class_updated`  | `{ classId }` | Class updated  |
| `dms:class_archived` | `{ classId }` | Class archived |

### Contact Events (`CONTACT_EVENTS`) — 3

| Event                 | Payload                 | Trigger                          |
| --------------------- | ----------------------- | -------------------------------- |
| `dms:contact_created` | `{ contactId }`         | Contact created                  |
| `dms:contact_updated` | `{ contactId }`         | Contact updated                  |
| `dms:contact_removed` | `{ contactId, reason }` | Contact removed (revokes shares) |

### Share Events (`SHARE_EVENTS`) — 2

| Event               | Payload                                                     | Trigger       |
| ------------------- | ----------------------------------------------------------- | ------------- |
| `dms:share_created` | `{ shareId, entityId, entityType, granteeId, granteeType }` | Share granted |
| `dms:share_revoked` | `{ shareId, entityId, entityType, granteeId, granteeType }` | Share revoked |

### Public Link Events (`PUBLIC_LINK_EVENTS`) — 3

| Event                      | Payload                                                | Trigger              |
| -------------------------- | ------------------------------------------------------ | -------------------- |
| `dms:public_link_created`  | `{ id, entityId, entityType, token, permission }`      | Public link created  |
| `dms:public_link_revoked`  | `{ publicLinkId, entityId, entityType }`               | Public link revoked  |
| `dms:public_link_accessed` | `{ id, entityId, entityType, token, ip?, userAgent? }` | Public link accessed |

### File View Events (`FILE_VIEW_EVENTS`) — 3

| Event                   | Payload          | Trigger           |
| ----------------------- | ---------------- | ----------------- |
| `dms:file_view_created` | `{ fileViewId }` | File view created |
| `dms:file_view_updated` | `{ fileViewId }` | File view updated |
| `dms:file_view_deleted` | `{ fileViewId }` | File view deleted |

## Command-Query Separation

### Commands (Write Side)

| Context | Command            | Method                                                     |
| ------- | ------------------ | ---------------------------------------------------------- |
| DMS     | Upload file        | `p.dms.files.upload()` / `uploadBulk()`                    |
| DMS     | Classify file      | `p.dms.triage.classify()`                                  |
| DMS     | Update file        | `p.dms.files.update()`                                     |
| DMS     | Rename file        | `p.dms.files.rename()`                                     |
| DMS     | Move file          | `p.dms.files.move()`                                       |
| DMS     | Copy file          | `p.dms.files.copy()`                                       |
| DMS     | Trash file         | `p.dms.files.delete()`                                     |
| DMS     | Restore file       | `p.dms.trash.restore()` / `files.restore()`                |
| DMS     | Purge file         | `p.dms.files.purge()`                                      |
| DMS     | Delete permanently | `p.dms.trash.deletePermanently()` (admin-only, hold-aware) |
| DMS     | Add version        | `p.dms.files.newVersion()`                                 |
| DMS     | Revert version     | `p.dms.files.revert()`                                     |
| DMS     | Place legal hold   | `p.dms.holds.place()`                                      |
| DMS     | Create folder      | `p.dms.folders.create()`                                   |
| DMS     | Move folder        | `p.dms.folders.move()`                                     |
| DMS     | Share entity       | `p.dms.shares.create()`                                    |
| DMS     | Create public link | `p.dms.shares.createPublicLink()`                          |
| DMS     | Create class       | `p.dms.classes.create()`                                   |
| DMS     | Create label       | `p.dms.labels.create()`                                    |
| DMS     | Apply label        | `p.dms.labels.apply()`                                     |
| DMS     | Create file view   | `p.dms.fileViews.create()`                                 |
| DMS     | Set default view   | `p.dms.fileViews.setDefault()`                             |
| DMS     | Create contact     | `p.dms.contacts.create()`                                  |

### Queries (Read Side)

| Context | Query                    | Method                                              |
| ------- | ------------------------ | --------------------------------------------------- |
| DMS     | Get file                 | `p.dms.files.get()` / `getById()`                   |
| DMS     | List files               | `p.dms.files.list()` (via folders/search)           |
| DMS     | List triaged files       | `p.dms.triage.list()` / `detail()`                  |
| DMS     | List trash               | `p.dms.trash.list()`                                |
| DMS     | List versions            | `p.dms.versions.list()` / `getCurrent()`            |
| DMS     | Get download link        | `p.dms.files.getDownloadLink()`                     |
| DMS     | Quick / full-text search | `p.dms.search.quick()` / `p.dms.search.search()`    |
| DMS     | Promote search to view   | `p.dms.search.promoteToView()`                      |
| DMS     | List shares              | `p.dms.shares.list()` / `listSharedWithMe()`        |
| DMS     | List public links        | `p.dms.shares.listPublicLinks()`                    |
| DMS     | Get activity feed        | `p.dms.activity.getFile()` / `getClass()` / `get()` |
| DMS     | List folders             | `p.dms.folders.list()`                              |
| DMS     | Get path breadcrumbs     | `p.dms.paths.getBreadcrumbs()`                      |
| DMS     | List labels              | `p.dms.labels.list()` / `listByLabel()`             |
| DMS     | List file views          | `p.dms.fileViews.list()` / `listByOwner()`          |

## Invariants & Business Rules

1. **Path uniqueness** — folder and file paths are unique (enforced by DB unique constraint on `dms_folder.path`).
2. **Path cascade** — moving/renaming a folder updates all descendant paths (`p.dms.paths`).
3. **Max nesting depth** — configurable (default 20); cycle-safe moves via `paths.wouldCreateCycle()`.
4. **Name uniqueness within parent** — case-insensitive uniqueness check.
5. **Version pruning** — old versions pruned to `maxVersions` (default 10); skipped under an active Legal Hold.
6. **Permission inheritance** — `access.getEffectivePermission()` walks up the parent folder chain for inherited permissions.
7. **Trash retention** — trashed/expired files and trashed folders are purged after retention via the `dms:auto-purge` cron; purge skipped for files on an active Legal Hold.
8. **Public link validation** — token, expiry, maxViews, and password (bcrypt) are checked on access.
9. **Triage gate** — uploads without a folder land in `triaged`; the only exit is `classify()` (→ `active`). Uploads into a folder are `active` immediately.
10. **Hold-aware purge** — permanent deletion and auto-purge of Files are blocked while an active Legal Hold exists; `trash.deletePermanently` is admin-only.
11. **Retention** — class-level `retentionDays` overrides the settings default.
12. **Classify validation** — required class fields must be satisfied before a File becomes active in that class.
13. **Contact removal** — requires a mandatory reason and revokes all shares granted to the contact.
