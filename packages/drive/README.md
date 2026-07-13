# @aspen-os/drive

A domain module for the Aspen OS framework that provides Google Drive-style file management: virtual folders with materialized paths, S3-backed file storage with versioning, labels, sharing with inheritance, public links, trash with auto-purge, and full-text search.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module API](#module-api)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Workflows](#workflows)
  - [Folders](#folders)
  - [Files](#files)
  - [Labels](#labels)
  - [Shares](#shares)
  - [Public Links](#public-links)
  - [Trash](#trash)
- [Services](#services)
- [Events](#events)
- [Integration Points](#integration-points)

## Overview

The drive module is a fully implemented domain module following the Aspen OS Domain Module Pattern. It provides comprehensive file management with 6 workflows, 5 services, 14 typed events, and a scheduled auto-purge job.

**Package**: `@aspen-os/drive`  
**Module name**: `"drive"`  
**Dependencies**: `@aspen-os/framework`, `drizzle-orm`, `valibot`, `fflate` (for ZIP generation)  
**Tables**: 8 tables, 4 pg enums

## Installation

```bash
bun install  # workspace package
```

## Quick Start

```ts
import { Framework } from "@aspen-os/framework/server"
import { DriveModule } from "@aspen-os/drive"

const drive = DriveModule.create()

const framework = Framework.create(config, { drive })

await framework.prepare()  // pushes schema, subscribes + schedules auto-purge

// Access workflows via the module proxy
framework.drive.folders      // FolderWorkflow
framework.drive.files        // FileWorkflow
framework.drive.labels       // LabelWorkflow
framework.drive.shares       // ShareWorkflow
framework.drive.publicLinks  // PublicLinkWorkflow
framework.drive.trash        // TrashWorkflow

// Access services
framework.drive.search       // SearchService
framework.drive.archive     // ArchiveService
framework.drive.access      // AccessService
framework.drive.paths       // PathService
```

## Module API

```ts
type DriveModuleConfig = {
  maxFileSize?: number               // default: 5GB (5 * 1024 * 1024 * 1024)
  maxNestingDepth?: number           // default: 20
  maxVersions?: number               // default: 10
  trashRetentionDays?: number        // default: 30
  defaultDownloadLinkExpiry?: number // default: 3600 (seconds)
  maxDownloadLinkExpiry?: number     // default: 604800 (7 days)
  allowedContentTypes?: string[]     // default: [] (allow all)
}

class DriveModule {
  static create(config?: DriveModuleConfig): DriveModule
  readonly name: "drive"
  readonly db_schema: typeof dbSchema

  initialize(units: { db: DatabaseUnit; storage: StorageUnit; pubsub: PubSubUnit }): void
  prepare(): Promise<void>   // subscribes to auto-purge topic + schedules cron
  destroy(): Promise<void>   // unsubscribes/unschedules purge

  // Workflow getters
  get folders(): FolderWorkflow
  get files(): FileWorkflow
  get labels(): LabelWorkflow
  get shares(): ShareWorkflow
  get publicLinks(): PublicLinkWorkflow
  get trash(): TrashWorkflow

  // Service getters
  get search(): SearchService
  get archive(): ArchiveService
  get access(): AccessService
  get paths(): PathService
}
```

## Configuration

Default configuration values:

| Option | Default | Description |
|---|---|---|
| `maxFileSize` | 5 GB | Maximum upload size per file |
| `maxNestingDepth` | 20 | Maximum folder nesting depth |
| `maxVersions` | 10 | Maximum file versions retained |
| `trashRetentionDays` | 30 | Days before trashed items are auto-purged |
| `defaultDownloadLinkExpiry` | 3600s (1 hour) | Default signed URL expiry |
| `maxDownloadLinkExpiry` | 604800s (7 days) | Maximum allowed signed URL expiry |
| `allowedContentTypes` | `[]` (all) | Content type whitelist (empty = allow all) |

Auto-purge runs daily at 3:00 AM via cron `"0 3 * * *"` on the topic `"drive:auto-purge"`.

## Database Schema

### Enums

| Enum | Values |
|---|---|
| `drive_item_type` | `file`, `folder` |
| `drive_grantee_type` | `user`, `group` |
| `drive_permission` | `viewer`, `editor`, `owner` |
| `drive_public_link_permission` | `view`, `edit` |

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `drive_folder` | Virtual folder | `path` (unique materialized path), `parentId`, `ownerId`, `isTrashed`, `trashedAt`, `color`, `description` |
| `drive_file` | File metadata | `storageKey`, `contentType`, `size` (bigint), `etag`, `version`, `isTrashed`, `path` (unique) |
| `drive_file_version` | Version history | `fileId`, `version`, `storageKey`, `size`, `etag`, `uploadedBy` |
| `drive_label` | Label definition | `color`, `isGlobal`, `ownerId` (nullable for global labels) |
| `drive_item_label` | Polymorphic label join | `itemId`, `itemType` (file/folder), `labelId`, unique(item, type, label) |
| `drive_share` | Direct sharing | `itemId`, `itemType`, `granteeId`, `granteeType` (user/group), `permission`, `expiresAt`, `message` |
| `drive_public_link` | Public link sharing | `token` (unique), `password` (hashed), `maxViews`, `viewCount`, `expiresAt`, `isActive`, `permission` |
| `drive_access_log` | Audit log | `itemId`, `itemType`, `action`, `ip`, `userAgent`, `accessedBy`, `publicLinkId` |

All IDs are `text` with `DEFAULT gen_random_uuid()::text`. All timestamps are `TIMESTAMPTZ` with `withTimezone: true`.

## Workflows

### Folders

`FolderWorkflow` (391 lines) -- manages the virtual folder tree with materialized paths:

```ts
framework.drive.folders.create(input: { name, parentId?, ownerId?, color?, description? }): Promise<Folder>
framework.drive.folders.rename(id, name): Promise<Folder>
framework.drive.folders.move(id, newParentId): Promise<Folder>
framework.drive.folders.update(id, patch): Promise<Folder>
framework.drive.folders.delete(id, force?: boolean): Promise<void>
framework.drive.folders.restore(id): Promise<Folder>
framework.drive.folders.get(id): Promise<FolderWithMetadata>  // includes childCount + totalSize
framework.drive.folders.list(filters?): Promise<Folder[]>
```

Key behaviors:
- **Materialized paths**: Folder paths are computed and stored (e.g., `/Projects/2024/Q1`). Renaming or moving a folder cascades path updates to all descendants via `PathService.cascadePaths()`.
- **Depth check**: Enforces `maxNestingDepth` (default 20) on creation and move.
- **Cycle detection**: Prevents moving a folder into its own subtree.
- **Name uniqueness**: Enforces unique names within the same parent.
- **Soft-delete**: `delete()` moves to trash (sets `isTrashed=true`, `trashedAt=now`). Non-empty folders require `force: true`.
- **Restore**: Checks if parent still exists; falls back to root if parent is gone.

### Files

`FileWorkflow` -- manages S3-backed files with versioning:

```ts
framework.drive.files.upload(input: { folderId?, filename, contentType, body, metadata? }): Promise<FileRecord>
framework.drive.files.download(id): Promise<{ stream, contentType, filename, size }>
framework.drive.files.getDownloadUrl(id, expiry?): Promise<string>  // presigned S3 URL
framework.drive.files.update(id, patch): Promise<FileRecord>
framework.drive.files.delete(id): Promise<void>     // soft-delete (trash)
framework.drive.files.restore(id): Promise<FileRecord>
framework.drive.files.getVersions(id): Promise<FileVersion[]>
framework.drive.files.revertToVersion(id, version): Promise<FileRecord>
framework.drive.files.getMetadata(id): Promise<FileRecord>
framework.drive.files.move(id, newFolderId): Promise<FileRecord>
framework.drive.files.copy(id, newFolderId?, newFilename?): Promise<FileRecord>
```

File uploads delegate to `StorageBridge` (which wraps the framework's `StorageUnit`). Version history is tracked in `drive_file_version`. Old versions are retained up to `maxVersions`.

### Labels

`LabelWorkflow` -- label CRUD and application:

```ts
framework.drive.labels.create(input: { name, color, isGlobal?, ownerId? }): Promise<Label>
framework.drive.labels.update(id, patch): Promise<Label>
framework.drive.labels.delete(id): Promise<void>
framework.drive.labels.list(filters?): Promise<Label[]>
framework.drive.labels.apply(itemId, labelId, itemType): Promise<void>
framework.drive.labels.remove(itemId, labelId, itemType): Promise<void>
framework.drive.labels.listForItem(itemId, itemType): Promise<Label[]>
```

Labels can be global (`isGlobal: true`) or user-owned. The `drive_item_label` table is polymorphic -- labels can be applied to both files and folders.

### Shares

`ShareWorkflow` -- direct sharing with inheritance:

```ts
framework.drive.shares.create(input: { itemId, itemType, granteeId, granteeType, permission, expiresAt?, message? }): Promise<Share>
framework.drive.shares.update(id, patch): Promise<Share>
framework.drive.shares.delete(id): Promise<void>
framework.drive.shares.list(itemId, itemType): Promise<Share[]>
framework.drive.shares.listForUser(userId): Promise<Share[]>
```

Permissions: `viewer` (read-only), `editor` (read-write), `owner` (full control). Shares inherit to child items (a share on a folder grants access to its contents). Share overrides are supported at the child level.

### Public Links

`PublicLinkWorkflow` -- public link sharing:

```ts
framework.drive.publicLinks.create(input: { itemId, itemType, permission, password?, maxViews?, expiresAt? }): Promise<PublicLink>
framework.drive.publicLinks.update(id, patch): Promise<PublicLink>
framework.drive.publicLinks.revoke(id): Promise<void>
framework.drive.publicLinks.resolve(token, password?): Promise<{ itemId, itemType, permission } | null>
framework.drive.publicLinks.list(itemId, itemType): Promise<PublicLink[]>
```

Features:
- Token-based access (unique tokens per link)
- Optional password protection (bcrypt hashed)
- View count tracking with `maxViews` limit
- Expiry dates
- `view` or `edit` permissions
- Access logging via `drive_access_log`

### Trash

`TrashWorkflow` -- trash management with auto-purge:

```ts
framework.drive.trash.list(userId?, filters?): Promise<TrashItem[]>
framework.drive.trash.restore(id, itemType): Promise<void>
framework.drive.trash.emptyTrash(userId?): Promise<void>
framework.drive.trash.purgeExpired(): Promise<number>  // called by scheduled cron
```

`purgeExpired()` permanently deletes items that have been in the trash longer than `trashRetentionDays` (default 30). This method is registered as a PubSub handler and scheduled via cron `"0 3 * * *"` in the module's `prepare()`.

## Services

| Service | File | Purpose |
|---|---|---|
| `PathService` | `services/path-service.ts` | Materialized path computation, depth checking, cycle detection, name uniqueness, breadcrumb resolution, cascade path updates on rename/move |
| `StorageBridge` | `services/storage-bridge.ts` | Wraps the framework's `StorageUnit` for upload, download, presigned URLs, copy, move, remove |
| `ArchiveService` | `services/archive-service.ts` | ZIP archive generation for folder downloads (uses `fflate`). Throws `ArchiveTooLargeError` for >1000 files or >1GB |
| `SearchService` | `services/search-service.ts` | Full-text search across files and folders with scope, type, label, content-type, date, and size filters |
| `AccessService` | `services/access-service.ts` | Permission checking, share inheritance resolution, public link access validation |

## Events

14 events are defined in `src/event-map.ts`, each with a typed payload interface. Events are actively published by workflows via PubSub.

| Event | Payload | Trigger |
|---|---|---|
| `drive:folder_created` | `{ folder: { id, name, path } }` | Folder created |
| `drive:folder_renamed` | `{ folderId, oldName, newName, oldPath, newPath }` | Folder renamed |
| `drive:moved` | `{ itemId, itemType, oldParentId, newParentId, oldPath, newPath }` | Item moved |
| `drive:file_uploaded` | `{ file: { id, name, size, contentType } }` | File uploaded |
| `drive:file_updated` | `{ fileId, version }` | File updated/new version |
| `drive:file_downloaded` | `{ fileId, userId }` | File downloaded |
| `drive:shared` | `{ share: { itemId, itemType, granteeId, permission } }` | Item shared |
| `drive:unshared` | `{ shareId }` | Share removed |
| `drive:public_link_created` | `{ linkId, itemId, itemType }` | Public link created |
| `drive:public_link_accessed` | `{ linkId, itemId, itemType, ip }` | Public link accessed |
| `drive:public_link_revoked` | `{ linkId }` | Public link revoked |
| `drive:trashed` | `{ itemId, itemType }` | Item moved to trash |
| `drive:restored` | `{ itemId, itemType }` | Item restored from trash |
| `drive:purged` | `{ count }` | Expired items permanently purged |

## Integration Points

| Integration | Usage |
|---|---|
| **DatabaseUnit** | All workflow DB operations via drizzle |
| **StorageUnit** | S3-backed file storage (upload, download, presigned URLs, copy, move, remove) via `StorageBridge` |
| **PubSubUnit** | Event publishing, auto-purge scheduling (`schedule()` + `subscribe()`) |
| **AuthUnit** | User IDs for folder ownership, sharing, access control |

The drive module is **self-contained** -- it has no optional module dependencies. It does not depend on `@aspen-os/constants` (unlike tasks).

## Package Structure

```
packages/drive/
  src/
    index.ts              # DriveModule class + type/schema re-exports (278 lines)
    db-schema.ts          # 8 tables + 4 pg enums (219 lines)
    types.ts              # Type re-exports + row types + config + interfaces (204 lines)
    event-map.ts          # 14 events with typed payloads (162 lines)
    schemas/
      index.ts            # Barrel re-exports
      enums.ts            # 4 valibot enum schemas
      utils.ts            # Shared validators (HexColorSchema, ItemNameSchema, etc.)
      folder.ts           # Folder schemas
      file.ts             # File schemas
      label.ts            # Label schemas
      share.ts            # Share schemas
      public-link.ts      # Public link schemas
      search.ts           # Search schemas
      trash.ts            # Trash schemas
    workflows/
      folder.ts           # FolderWorkflow (391 lines)
      file.ts             # FileWorkflow
      label.ts            # LabelWorkflow
      share.ts            # ShareWorkflow
      public-link.ts      # PublicLinkWorkflow
      trash.ts            # TrashWorkflow
    services/
      path-service.ts     # PathService (materialized paths)
      storage-bridge.ts   # StorageBridge (wraps StorageUnit)
      archive-service.ts  # ArchiveService (ZIP generation)
      search-service.ts   # SearchService (full-text search)
      access-service.ts   # AccessService (permission checks)
```

## SOW Reference

- [Drive SOW](../../docs/sow/drive.md) -- full statement of work including data model, workflow definitions, RBAC model, and phase sequencing
