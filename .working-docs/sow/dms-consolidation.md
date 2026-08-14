# DMS Module — Consolidation (Scope of Work)

> Scope of Work to reduce redundancy in `@aspen-os/dms` and consolidate the module into a single, simple document/files surface. The free-form filesystem (folders, paths) and the class-first records system (triage, classes, versions) collapse onto **one `file` entity**; Drive is removed; tags, dual pins, split events/enums, and duplicated sharing/trash/search surfaces are eliminated. **No existing feature is dropped** — features are merged and renamed, not deleted.

## Overview

`@aspen-os/dms` today carries **two overlapping subsystems**:

1. **Native records system** (per `sow/dms.md`): `document` with a compulsory **Triage** gate, Document Classes, versions, views, contacts, document shares, legal holds, retention, recycle bin (`bin`), activity, settings, sidebar pins, full-text search.
2. **A free-form filesystem — a verbatim port of `@aspen-os/drive`**: `item-file`, `item-folder`, `item-label`, `item-public-link`, `item-share`, `item-trash`, `driveSearch`, plus `item-access`/`item-archive`/`item-path`/`item-storage-bridge` services and 14 `dms:item_*` events.

The **same thing** is modeled twice (`document` vs `item-file`), sharing is split three ways (`share` + `item-share` + `public-link`), deletion is split two ways (`bin` + `item-trash`), labeling vs tagging overlap (`label` vs `tag`), and the whole filesystem exists twice in the monorepo (here and in `@aspen-os/drive`).

This consolidation removes the repetition: one `file`, one label mechanism, one sharing module, one trash module, one term set.

### Confirmed Decisions

| #   | Decision                  | Outcome                                                                                                                                                                                                                                                           |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Drive package             | **Delete `@aspen-os/drive`.** Its surface stays in DMS; DMS is the single module.                                                                                                                                                                                 |
| 2   | `item-file` == `document` | They are the same thing. **One unified `dms_file` table** (folder/path + class/triage/versions + lifecycle on a single row). `file` is the primary term; `document` disappears.                                                                                   |
| 3   | File lifecycle            | **Single `status` enum** on `dms_file`: `triaged` / `active` / `expired` / `trashed`. Trash covers both the records recycle bin and the filesystem trash — powering the merged trash module. Folders keep their own `isTrashed` (they are containers, not files). |
| 4   | Triage gate               | Files uploaded **into a folder are `active` immediately**; the triage gate applies only when a file is uploaded for classification into a class. The filesystem stays free-form.                                                                                  |
| 5   | `item-` prefix            | **Removed from the entire module.** Polymorphic joins (`dms_item_label`, `dms_item_share`) target file **or** folder, so the generic term **`entity`** replaces `item` (`dms_entity_label`, `dms_entity_share`, `dms_entity_type` enum).                          |
| 6   | Tags vs labels            | **Tags are removed; labels stay.** A file can carry multiple labels (`dms_label` + polymorphic `dms_entity_label`). `dms_tag`, `dms_document_tag`, and `dms_file.tags` (jsonb) are dropped.                                                                       |
| 7   | Sharing                   | **`share` + `item-share` + `public-link` merge** into one sharing module (`dms_share` grants to `user`/`group`/`contact` + `dms_public_link`), surfaced as a single `shares` group.                                                                               |
| 8   | Trash                     | **`bin` + `item-trash` merge** into one `trash` module over `status = trashed                                                                                                                                                                                     | expired` files, trashed folders, retention auto-purge, and admin-only permanent delete (hold-aware). |
| 9   | Views                     | **`view` is renamed `file_views`** everywhere (table `dms_file_view`, group `fileViews`, schemas, events, pin item type).                                                                                                                                         |
| 10  | Pins                      | One mechanism: the generic `dms_pin` table. `dms_view.isPinned` and `view.pin`/`view.unpin` are dropped; view pins route through `p.dms.pins` with item type `file_view`.                                                                                         |
| 11  | SOW location              | This new file `sow/dms-consolidation.md`; the original `sow/dms.md` stays as the historical design record.                                                                                                                                                        |

---

## 1. Current State & Redundancy Inventory

### 1.1 The item subsystem is a Drive clone

`diff` between DMS `item-*` sources and Drive `*` sources shows only renames — table prefixes (`dms_file` vs `drive_file`), event names, workflow names. Nothing else diverges.

| Layer                       | DMS item files                                                                                                    | Drive equivalent                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| DB tables (8)               | `access-log`, `file`, `file-version`, `folder`, `item-label`, `item-share`, `label`, `public-link` (+ item enums) | identical, `drive_*` prefix                                      |
| Workflows (44 + `items.ts`) | `item-file.*`, `item-folder.*`, `item-label.*`, `item-public-link.*`, `item-share.*`, `item-trash.*`              | identical                                                        |
| Services (6)                | `item-access`, `item-archive`, `item-path`, `item-purge`, `item-search`, `item-storage-bridge`                    | `access`, `archive`, `path`, `purge`, `search`, `storage-bridge` |
| Module surface              | `p.dms.files/.folders/.labels/.publicLinks/.shares/.trash/.driveSearch/.access/.archive/.paths/.storage`          | `p.drive.*` identical                                            |

Roughly **40%** of DMS by volume (~2,300 of ~5,600 workflow LOC, ~1,000 of ~2,300 service LOC) is a copy of Drive.

### 1.2 Internal duplication (the consolidation targets)

| Duplication                 | Pieces today                                                                                                               | Merged into                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Two file entities           | `dms_document` (+ `dms_document_version`) and `dms_file` (+ `dms_file_version`)                                            | One `dms_file` + one `dms_file_version`                         |
| Two delete/restore surfaces | `bin.*` (documents) + `item-trash.*` (files/folders)                                                                       | One `trash` group                                               |
| Three sharing surfaces      | `share.*` (documents→contact/user) + `item-share.*` (files/folders→user/group) + `item-public-link.*`                      | One `shares` group (grants + public links)                      |
| Tagging vs labeling         | `dms_tag` + `dms_document_tag` + `dms_document.tags` jsonb vs `dms_label` + `dms_item_label`                               | Labels only                                                     |
| Dual pin mechanism          | `dms_view.isPinned` (`view.pin`/`view.unpin`) vs `dms_pin` table                                                           | `dms_pin` only                                                  |
| Split event/enum files      | `pubsub.ts` + `item-pubsub.ts`; `schemas/enums.ts` + `schemas/item-enums.ts`                                               | Single `pubsub.ts`, single `enums.ts`                           |
| Duplicated services         | `search-service` + `item-search-service`, `purge-service` + `item-purge-service`, `storage-bridge` + `item-storage-bridge` | One of each                                                     |
| Misleading names            | `item-*` prefixes, `driveSearch`, `view` term, `pin.create.ts` group file                                                  | `file`/`folder`/`label`/`share`/`trash`, `fileViews`, `pins.ts` |

### 1.3 Cross-repo references to `@aspen-os/drive`

| Location                                                                                                     | Change needed                                                                |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `packages/drive/` (whole package: `src/`, `docs/`, `README.md`, `package.json`, `tsconfig.json`, `.output/`) | Delete                                                                       |
| Root `tsconfig.json` line 35 (`{ "path": "./packages/drive" }`)                                              | Remove reference                                                             |
| `docs/source.config.ts` lines 32–33 (`defineDocs({ dir: "../packages/drive/docs" })`)                        | Remove docs source                                                           |
| `packages/inventory/tsconfig.json` line 3 (`declarationDir: "../../.local/types/drive"`)                     | **Copy-paste bug** — points at drive's types dir; fix to inventory's own dir |
| `CONTEXT.md` (Drive Domain §~308–350, deprecation note §342, DMS superset notes §452, §565, §582–590, §599)  | Rewrite to DMS-only                                                          |
| `AGENTS.md` (fully-implemented list §9, key dirs §72, module pattern §137/§143/§145, current state §234)     | Remove drive mentions                                                        |
| `.working-docs/sow/dms.md` §13 (Relationship to Drive)                                                       | Rewrite — Drive no longer exists                                             |
| `packages/dms/docs/overview.mdx` (deprecation/superset narrative, `(Drive)` group labels)                    | Rewrite DMS-only                                                             |
| DMS docs (`access-control.mdx`, `db-schemas.mdx`, `events.mdx`, `workflows.mdx`)                             | Align to the consolidated model (§4)                                         |

No code outside `packages/dms` imports `@aspen-os/dms` or `@aspen-os/drive`; `scripts/build.ts` auto-discovers packages (no hardcoded list). The refactor is confined to `packages/dms` plus the reference cleanup above.

---

## 2. Target Model (Post-Consolidation)

### 2.1 Tables

| Table              | Source                                            | Notes                                                                       |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------------------------- |
| `dms_file`         | merge `dms_document` + `dms_file`                 | Single entity; see §3.2.                                                    |
| `dms_file_version` | merge `dms_document_version` + `dms_file_version` | Version history for `dms_file`.                                             |
| `dms_folder`       | `dms_folder`                                      | Keeps its own `isTrashed`/`trashedAt`/`trashedBy`.                          |
| `dms_class`        | rename `dms_document_class`                       | `document` term gone.                                                       |
| `dms_class_field`  | `dms_class_field`                                 | Unchanged.                                                                  |
| `dms_label`        | `dms_label`                                       | Single labeling mechanism.                                                  |
| `dms_entity_label` | rename `dms_item_label`                           | Polymorphic join `(entity_type file/folder, entity_id, label_id)`.          |
| `dms_share`        | merge `dms_share` + `dms_item_share`              | Grants to `user`/`group`/`contact`; polymorphic `(entity_type, entity_id)`. |
| `dms_public_link`  | `dms_public_link`                                 | Lives in the unified shares module.                                         |
| `dms_contact`      | `dms_contact`                                     | Unchanged (external share handle).                                          |
| `dms_legal_hold`   | `dms_legal_hold`                                  | Now references `dms_file`.                                                  |
| `dms_file_view`    | rename `dms_view`                                 | Saved filter/sort configurations.                                           |
| `dms_pin`          | `dms_pin`                                         | Item type enum → `triage`, `file_view`, `class`.                            |
| `dms_setting`      | `dms_setting`                                     | Unchanged.                                                                  |
| `dms_access_log`   | `dms_access_log`                                  | Access/download logging (public links, `logDownloads`).                     |

**Dropped:** `dms_document`, `dms_document_version`, `dms_document_tag`, `dms_tag`, `dms_item_share`, `dms_item_label` (renamed), `dms_view` (renamed), `dms_file.tags` column.

### 2.2 Module surface (workflow groups)

```
p.dms.files       upload, uploadBulk, get, download, update, rename, move, copy,
                  getDownloadLink, listVersions, newVersion, revert, deleteVersion,
                  classify, restore, purge, tag(dropped) → label via p.dms.labels,
                  addMetadata/removeMetadata
p.dms.folders     create, get, getById, list, rename, move, update, restore
p.dms.classes     create, get, list, update, archive, addField, updateField, deactivateField
p.dms.labels      create, update, delete, list, apply, remove, listByLabel
p.dms.shares      grants: create, update, remove, list, listByGrantee, resolveToken,
                  listSharedWithMe
                  public links: createPublicLink, updatePublicLink, revokePublicLink,
                  getPublicLink, listPublicLinks, resolvePublicLink
p.dms.trash       list, restore, deletePermanently, empty, purgeExpired
p.dms.fileViews   apply, create, update, delete, list, listByOwner, getDefault, setDefault
p.dms.triage      list, detail, classify            (kept as a convenience projection)
p.dms.pins        create, delete, list              (item types: triage, file_view, class)
p.dms.contacts    create, get, list, update, remove
p.dms.holds       list, place, release
p.dms.settings    get, set
p.dms.search      search, quick, promoteToView     (records + filesystem search merged;
                                                   driveSearch folded in)
p.dms.activity    get, getClass, getFile           (renamed from getDocument)
p.dms.access      checkPermission, getEffectivePermission, isOwner, logAccess
p.dms.paths       (folder path helpers)            p.dms.storage (storage bridge)
p.dms.archive     createArchive, processArchiveJob
```

### 2.3 Events

- `dms:document_*` → **`dms:file_*`**: `file_uploaded`, `file_classified`, `file_updated`, `file_expired`, `file_trashed` (was `deleted`), `file_restored`, `file_purged`, `file_hold_placed`/`file_hold_released`, `file_version_added`/`file_version_reverted`.
- `dms:view_*` → **`dms:file_view_*`**: `file_view_created`/`updated`/`deleted`.
- `dms:item_*` merged into the relevant surfaces: `file_*`/`folder_*`/`share_*`/`public_link_*` (`folder_created`, `folder_renamed`, `file_moved`, `file_shared`/`file_unshared`, `public_link_created`/`revoked`/`accessed`).
- `dms:class_*`, `dms:contact_*` unchanged. `dms:document_tagged`/`untagged` dropped with tags; `dms:share_*` gains `group` grantee.

---

## 3. Phase 1 — Remove `@aspen-os/drive`

1. `rm -rf packages/drive` (source, docs, `README.md`, `package.json`, `tsconfig.json`, `.output/`, stale `.local/types/drive`).
2. Root `tsconfig.json` — remove `{ "path": "./packages/drive" }` from `references`.
3. `docs/source.config.ts` — remove the `drive` docs source.
4. `packages/inventory/tsconfig.json` — fix `declarationDir` (currently `../../.local/types/drive`) to the inventory package's own dir.
5. `bun install` to refresh the workspace graph / lockfile.
6. Documentation — rewrite `CONTEXT.md`, `AGENTS.md`, `.working-docs/sow/dms.md` §13, and `packages/dms/docs/overview.mdx` so DMS is described as the single module with **no** Drive/deprecation framing.

---

## 4. Phase 2 — Unified `file` Entity (the core merge)

### 4.1 Schema merge

`dms_file` combines the two existing tables:

| Column                                                               | Source                   | Notes                                                                                  |
| -------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `id`, `name`, `version`, `storageKey`, `contentType`, `size`, `etag` | both                     | unified; storage key `dms/{tenant}/{fileId}/v{n}/{name}` (single scheme)               |
| `folderId`, `path`                                                   | filesystem (`dms_file`)  | nullable; `path` materialized when in a folder                                         |
| `classId`, `docNumber`, `fieldValues`                                | records (`dms_document`) | `docNumber` assigned on classification (`DOC-######`); null for plain filesystem files |
| `status`                                                             | **new merged enum**      | `triaged` / `active` / `expired` / `trashed` (replaces `status` + `isTrashed`)         |
| `expiryDate`, `expiredAt`, `batchId`, `compression`                  | records                  | unchanged semantics                                                                    |
| `deletedAt`, `deletedBy`                                             | records                  | trash provenance (now also used by filesystem trash)                                   |
| `metadata`, `ownerId`, `uploadedBy`, `createdAt`, `updatedAt`        | both                     | unified                                                                                |

`dms_file_version` merges `dms_document_version` + `dms_file_version` (same columns — document/version/history differences collapse naturally). The tsvector GIN index (name + metadata + fieldValues, now + label names) moves onto `dms_file` with `folderId`, `classId`, `status`, `ownerId`, `batchId`, `expiryDate` supporting indexes.

### 4.2 Lifecycle & status transitions

```
upload into folder ──────▶ active ───────────▶ trashed ──────retention/auto-purge──▶ purged
upload to triage ──▶ triaged ──classify──▶ active           (legal hold blocks purge)
                                     active ──expiry──▶ expired ──▶ trashed  (restore reactivates)
```

- **Upload into a folder** → `active` immediately (decision 4). **Upload without a folder (staged for classification)** → `triaged`; `classify` validates required class fields, applies the file-naming schema (metadata-only rename), assigns `docNumber`, sets `active`.
- **Soft delete / trash** (records `delete` or filesystem `trash`) → `status = trashed`, `deletedAt`/`deletedBy` set. Restore → `active`.
- **Expiry scanner** promotes past-due files to `expired` (retains class, fields, versions). Restore with optional renewed `expiryDate`.
- **Purge** (auto-purge or admin `deletePermanently`) removes all version objects + rows, cascading labels/shares/views-pins/holds. Legal holds block purge; retention resolved per class or the settings default.
- `maxVersions` prune applies to the merged version history (held files never pruned).

### 4.3 Workflows merged

Replace `document.*` + `item-file.*` + `triage.*` + `version.*` with `file.*` + `version.*` (kept as a `fileVersion`-aware group or folded into `files`), plus the merged `bin`/trash logic (§6). `steps/fetch-document` → `steps/fetch-file`. Audit entity type `document` → `file` (`AUDIT_ENTITY_TYPE.FILE`).

---

## 5. Phase 3 — Labels Replace Tags

1. **Drop**: `dms_tag`, `dms_document_tag` tables; `dms_file.tags` jsonb column; `tag`/`untag` workflows; `dms:document_tagged`/`untagged` events; tag autocomplete in `search-service`.
2. **Keep as the single mechanism**: `dms_label` (`name`, `color`, `ownerId`/`isGlobal`) + `dms_entity_label` (polymorphic `entity_type` file/folder) renamed from `dms_item_label`. A file can carry **multiple labels** (many-to-many); folders can too.
3. `label.apply`/`label.remove`/`label.listByLabel` become the file-label operations (`dms_label_apply`), and quick search suggests labels (not tags).
4. Upload input accepts `labelIds` (validated) instead of `tags`; `classify` may auto-suggest labels per class later (out of scope).

---

## 6. Phase 4 — Unified Sharing (grants + public links)

One `dms_share` table replaces `dms_share` + `dms_item_share`:

| Column                               | Notes                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `entityType` / `entityId`            | polymorphic target — `file` or `folder` (enum `dms_entity_type`); grants to a folder inherit down the folder tree |
| `granteeType` / `granteeId`          | `user` (internal), `group` (internal group), `contact` (external, token-based)                                    |
| `permission`                         | `viewer` / `editor` / `owner` (owner added; records system previously capped at `editor`)                         |
| `shareToken`                         | for `contact` grantees (16-byte base64url); revoke/contact-removal invalidates immediately                        |
| `expiresAt`, `sharedBy`, `createdAt` | unchanged                                                                                                         |

- `dms_public_link` stays its own table (token, optional password, `view`/`edit` permission, `maxViews`/`viewCount`, `expiresAt`, `isActive`, `entityType`/`entityId`) but is **managed by the same `shares` group** — public-link CRUD, resolve, revoke, and access logging sit beside grant operations. `listSharedWithMe` unions grants + public links.
- Contact removal cascade revokes every grant + public link targeting that contact.
- Delete this SOW's earlier notion of a separate `documentShares` group: `p.dms.shares` is the one group.

---

## 7. Phase 5 — Unified Trash

Merge `bin.*` (records) + `item-trash.*` (filesystem) into one `trash` group:

1. **Model**: trash is `dms_file.status ∈ {trashed, expired}` **plus** `dms_folder.isTrashed`. One listing with provenance (trashed vs expired), class/fields retained, `held` flag, restore eligibility.
2. **Operations**: `trash.list`, `trash.restore` (file/folder; expired files may take a renewed `expiryDate`), `trash.deletePermanently` (admin-only, rejected under active legal hold), `trash.empty`, `trash.purgeExpired` (auto-purge cron).
3. **Retention**: class-level `retentionDays` overrides the settings default; counts from `deletedAt`/`expiredAt`/`trashedAt`; auto-purge skips held files and folder subtrees.
4. **Services**: merge `purge-service.ts` + `item-purge-service.ts` into one `purge-service.ts`; single purge cron registration in `Dms.$prepareRuntime()` (expiry scanner + one purge schedule).
5. `AUDIT_ENTITY_TYPE.FILE` for file trash events; `dms:file_trashed` / `dms:file_restored` / `dms:file_purged`.

---

## 8. Phase 6 — Term Consolidation

Mechanical rename pass across `packages/dms` after the functional merges:

1. **Remove `item-` prefix** on all remaining files: `item-folder.*` → `folder.*`, `item-label.*` → `label.*`, `item-public-link.*` → `public-link.*`, `item-share.*` → `share.*`, `item-trash.*` → `trash.*`; services `item-access-service` → `access-service`, `item-archive-service` → `archive-service`, `item-path-service` → `path-service`, `item-search-service` → (fold into `search-service`), `item-storage-bridge` → (fold into `storage-bridge`); schemas `item-*.ts` fold into their unprefixed counterparts; steps `fetch-item-*` → `fetch-*`.
2. **`entity` replaces `item` as the polymorphic term**: `dms_entity_label`, `dms_entity_share`, enum `dms_entity_type` (`file`/`folder`); `ItemType` constant → `EntityType`; `ItemGranteeType`/`ItemPermission` merge into the share constants.
3. **`view` → `file_views`**: table `dms_view` → `dms_file_view`, group `views` → `fileViews`, schemas `*View*` → `*FileView*`, workflows `view.*` → `file-view.*`, events `dms:view_*` → `dms:file_view_*`, pin item type `view` → `file_view`.
4. **`driveSearch` folds into `search`** (records + filesystem search are one service); `pin.create.ts` → `pins.ts`; `items.ts` is dissolved — groups move to `workflows/index.ts` under their final names.
5. **Single surface files**: merge `item-pubsub.ts` → `pubsub.ts` and `schemas/item-enums.ts` → `schemas/enums.ts`.
6. **DMS-internal pin consolidation** (decision 10): drop `dms_view.isPinned` + `view.pin`/`view.unpin` + `dms:view_pinned`/`unpinned`; route pins through `p.dms.pins` with item type `file_view`; fix the `pin.create.ts` audit bug (currently logs entity type `VIEW` for class/triage pins).
7. **Module surface alignment** per §2.2; update `types.ts` exports to the new names.

> **Deployment notes (host app):** `pushSchema` (ADR 0004) never drops tables/columns. The host migration must `DROP TABLE` the merged-away tables (`dms_document`, `dms_document_version`, `dms_document_tag`, `dms_tag`, `dms_item_share`, `dms_item_label`, `dms_view`), drop `dms_file.tags`/`dms_view.is_pinned`, migrate `dms_document`+`dms_file` rows into the unified `dms_file`, and rename enums/tables per §2.1. No migration tooling ships in this repo.

---

## 9. Phase 7 — Documentation & Verification

1. **Docs**: rewrite `packages/dms/docs/` (`overview.mdx`, `access-control.mdx`, `db-schemas.mdx`, `events.mdx`, `workflows.mdx`) to the consolidated model; update `CONTEXT.md`, `AGENTS.md`, `.working-docs/sow/dms.md`, and this SOW's referenced files to drop `document`/`tag`/`drive`/`view` terminology.
2. **Gates** (no test infrastructure — see `AGENTS.md`; quality gates are types/lint/build):
   - `bun install`
   - Root `bun run check:lint` and `bun run check:types`
   - `cd packages/dms && bun run check:lint && bun run check:types && bun run build`
   - Docs: `cd docs && bunx fumadocs-mdx` (if `.source/` missing) then `check:types` + `build`
3. **Sweep greps return clean**: `@aspen-os/drive`, `packages/drive`, `drive_file`, `DRIVE_EVENTS`, `p.drive.`; and inside `packages/dms`: `dmsDocument`, `dmsTag`, `dmsItem`, `isPinned`, `driveSearch`, `dms:view_`, `documentShares`, `bin\.`.

**Acceptance criteria** — module compiles/lints/builds; Drive and all references gone; one `dms_file` entity, one label mechanism, one sharing group, one trash module; `file_views` terminology in place; no `item-`/`document`/`tag`/`drive`/`view` leftovers; docs describe the consolidated DMS.

---

## 10. Effort Estimate (Relative)

| Area                                                                             | Complexity  | Notes                                                              |
| -------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| Remove `@aspen-os/drive` + reference sweep                                       | Low         | Deletion + `inventory/tsconfig.json` fix; docs rewrites.           |
| Unified `file` entity (schema, status, versions, storage keys, triage semantics) | **High**    | The core merge; touches most workflows/services/schemas.           |
| Labels replace tags                                                              | Low–Medium  | Drop tag tables/columns/events; route label apply; search updates. |
| Unified sharing (+ public links)                                                 | Medium–High | One share table + grantee union; permission model gains `owner`.   |
| Unified trash (bin + item-trash)                                                 | Medium      | Status-based listing; folder subtrees; one purge service/cron.     |
| Term consolidation (`item-` removal, `file_views`, `entity`, surface merges)     | Medium      | Mechanical but wide; mechanical renames are the risk-free bulk.    |
| Docs + verification                                                              | Medium      | All DMS docs rewritten; grep sweeps + build gates.                 |

---

## 11. Out of Scope

- **No behavior loss** — every current feature survives the consolidation (uploads, folders, versions, classes, contacts, holds, retention, pins, search, activity, settings, public links, shares, trash); they are merged, renamed, and re-termed.
- **No data migration tooling** — no host app lives in this repo; deployment notes in §8 are provided for the host app's own migration.
- **No new features** — this is consolidation only (e.g., no OCR, no resumable uploads, no approval workflows; see `sow/dms.md` §14).
- **No changes to `dms_folder` semantics** beyond trash-term alignment (folders keep `isTrashed`, path machinery, depth limits, cycle-safe moves).
- **No host app / example** — module consolidation only.
