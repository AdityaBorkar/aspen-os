# DMS Context

> Package: `@aspen-os/dms`. The sole document-management module — a single `file` entity carrying both filesystem and records attributes. Triage → Classify → active; classes with typed fields; folders, labels, contacts, shares + public links, versions, search, trash + retention, and legal holds.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Runtime-wired — receives `{ db, auth, pubsub, storage }` via `$initialize(units)` (stores `#db` + `#pubsub`, wires storage via `setDmsStorage()`; `auth` is type-required but unused), registers schedules/handlers in `$prepareRuntime()`.

## Structure (`packages/dms/`)

- `Dms.create(config?)` — factory returning a Module instance; `$config: Required<DmsModuleConfig>` (10 settings with defaults: `allowedContentTypes`, `defaultAutoPurgeEveryHours` (24), `defaultCompression`, `defaultDownloadLinkExpiry` (3600), `defaultRetentionDays` (180), `maxDownloadLinkExpiry` (604800), `maxFileSize` (5 GiB), `maxNestingDepth` (20), `maxVersions` (10), `trashRetentionDays` (30))
- `$name = "dms"`, `$dependencies = []` — no module deps
- 18 workflow groups exposed as `readonly` properties: `access`, `activity`, `archive`, `classes`, `contacts`, `fileViews`, `files`, `folders`, `holds`, `labels`, `paths`, `search`, `settings`, `shares`, `storage`, `trash`, `triage`, `versions`
- 11 services: `access-service`, `archive-service`, `classify-service`, `compression-service`, `condition-service`, `expiry-scanner`, `path-service`, `purge-service`, `search-service`, `settings-service`, `storage-bridge`; 8 reusable `WorkflowStep`s (`fetch-*`) in `workflow-steps/`
- 14 database tables (all `tenant_schemas`, `dms_` prefix): `dms_folder`, `dms_file`, `dms_file_version`, `dms_class`, `dms_class_field`, `dms_entity_label`, `dms_label`, `dms_file_view`, `dms_contact`, `dms_share`, `dms_public_link`, `dms_legal_hold`, `dms_access_log`, `dms_setting`
- 33 domain events across 7 maps (`CLASS_EVENTS` 3, `CONTACT_EVENTS` 3, `FILE_EVENTS` 13, `FILE_VIEW_EVENTS` 3, `FOLDER_EVENTS` 6, `PUBLIC_LINK_EVENTS` 3, `SHARE_EVENTS` 2) → `DmsEventMap`
- 11 ACL resources: `class`, `classField`, `contact`, `file`, `fileView`, `folder`, `label`, `legalHold`, `publicLink`, `setting`, `share`
- `$prepareRuntime()` — registers 2 cron schedules + handlers: `dms:expiry-scan` (`5 0 * * *`), `dms:auto-purge` (`30 3 * * *`); `$cleanup()` unregisters them
- Audit-driven **Activity Feed**: file/folder activity is written inline to the platform's `AuditUnit` (`audit_log`), queried via `ctx.audit.query()` — not a DMS-owned table, not PubSub events
- Module-scope runtime state in `runtime.ts` (`setDmsConfig`/`setDmsStorage`/`getDmsConfig`/`getDmsStorage`)
- Has a build step (build script + `build` field in package.json)

## Exposed on the platform instance

```
p.dms.access       (service facade)   p.dms.archive   (service facade)   p.dms.activity
p.dms.classes      { addField, archive, create, deactivateField, get, list, update, updateField }
p.dms.contacts     { create, get, list, remove, update }
p.dms.fileViews    { apply, create, delete, getDefault, list, listByOwner, setDefault, update }
p.dms.files        { addMetadata, classify, copy, delete, deleteVersion, download, get, getById,
                     getDownloadLink, listVersions, move, newVersion, purge, removeMetadata,
                     rename, restore, revert, update, upload, uploadBulk }
p.dms.folders      { create, delete, get, getById, list, move, rename, restore, update }
p.dms.holds        { list, place, release }
p.dms.labels       { apply, create, delete, list, listByLabel, remove, update }
p.dms.paths        (service facade)
p.dms.search       { promoteToView, quick, search }
p.dms.settings     { get, set }
p.dms.shares       { create, createPublicLink, get, getPublicLink, list, listByGrantee,
                     listPublicLinks, listSharedWithMe, remove, resolvePublicLink,
                     resolveToken, revokePublicLink, update, updatePublicLink }
p.dms.storage      (service facade)
p.dms.trash        { deletePermanently, empty, list, purgeExpired, restore }
p.dms.triage       { classify, detail, list }
p.dms.versions     { delete, get, getCurrent, list, new, revert }
```

## Lineage

DMS is the sole document-management module. The `@aspen-os/drive` package was **removed** and its free-form filesystem surface consolidated with the records system (`.working-docs/sow/dms-consolidation.md`, Phases 1–7 complete): one `file` entity (`dms_file` carries folder/path + class/triage/lifecycle), one label mechanism (`dms_label` + `dms_entity_label`), one sharing group (`p.dms.shares`), one trash module over `status`, and `fileViews` terminology — no `document`/`item-`/`tag`/`view`/`drive` leftovers. The `dms_document*`/`dms_tag`/`dms_view`/`dms_item_*` tables no longer exist.

## Language

- File, Triage, Classify, Class, Class Field, File Version, File View, Full-Text Search, Contact, Share (DMS), Public Link (DMS), Legal Hold, Retention, Trash (DMS), Label (DMS), Activity Feed, DmsModuleConfig
- Avoid: Document (for File), Inbox/Draft Folder (for Triage), Document Type/Category (for Class), Recycle Bin (for Trash), Tag (for Label), Saved Filter (for File View), External Link (for Share/Public Link)
