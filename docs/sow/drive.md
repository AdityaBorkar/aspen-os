# Drive Module — Scope of Work

> Scope of Work for a Google Drive-style file management module built on the `@aspen-os/platform`.

## Overview

The Drive Module provides a virtual filesystem layer on top of the platform's StorageUnit, enabling users and teams to organize, store, share, and retrieve files through a familiar folder-based hierarchy. It adds path-based navigation, label-based categorization, download link generation, and public sharing with configurable access controls. All binary storage is delegated to the StorageUnit (S3); the Drive module owns the metadata, hierarchy, permissions, and sharing semantics.

---

## 1. Filesystem — Folders & Files

### 1.1 Folder

A virtual container that organizes files and sub-folders into a tree.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Display name (e.g., `Q4 Reports`). |
| **Path** | text | Materialized path from root (e.g., `/finance/Q4 Reports`). Unique, indexed. |
| **Parent** | text (FK, nullable) | Parent folder ID; `null` for root-level folders. |
| **Owner** | text (FK) | User who created the folder. |
| **Description** | text (nullable) | Optional description. |
| **Color** | text (nullable) | Hex color for UI display. |
| **Is Trashed** | boolean | Soft-delete flag. Default `false`. |
| **Trashed At** | timestamptz (nullable) | When the folder was moved to trash. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `createFolder(input)` — create a folder; auto-compute path from parent.
- `renameFolder(id, name)` — rename; cascade path updates to all descendants.
- `moveFolder(id, newParentId)` — move subtree; recompute paths for entire subtree.
- `deleteFolder(id)` — soft-delete (move to trash). Hard-delete only if folder is empty or via `force`.
- `restoreFolder(id)` — restore from trash (requires parent still exists; otherwise restore to root).
- `getFolder(id)` — fetch folder with computed metadata (child count, total size).
- `listFolder(id?, opts?)` — list children (files + sub-folders) with pagination, sort, and filter.

**Constraints**:
- Path uniqueness enforced at DB level — no two items (file or folder) share the same path.
- Folder names: max 255 chars, no `/` or null bytes, case-preserving but case-insensitive uniqueness within same parent.
- Maximum nesting depth: configurable (default: 20 levels).
- Cannot move a folder into itself or its own descendants (cycle detection).
- Trashed folders are excluded from normal listings; contents are inaccessible unless individually restored.

### 1.2 File

A stored binary object with metadata. The actual bytes live in S3 via the StorageUnit.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Display name including extension (e.g., `report.pdf`). |
| **Path** | text | Materialized path from root (e.g., `/finance/Q4 Reports/report.pdf`). Unique, indexed. |
| **Folder** | text (FK, nullable) | Parent folder ID; `null` for root-level files. |
| **Owner** | text (FK) | User who uploaded the file. |
| **Storage Key** | text | S3 object key in the StorageUnit. |
| **Content Type** | text | MIME type (e.g., `application/pdf`). |
| **Size** | bigint | File size in bytes. |
| **ETag** | text (nullable) | S3 ETag for integrity verification. |
| **Description** | text (nullable) | Optional description. |
| **Version** | integer | Current version number (starts at 1). |
| **Is Trashed** | boolean | Soft-delete flag. Default `false`. |
| **Trashed At** | timestamptz (nullable) | When the file was moved to trash. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `uploadFile(input)` — upload a file into a folder; delegates to StorageUnit.upload(); creates file record.
- `downloadFile(id)` — returns a presigned GET URL via StorageUnit.getSignedGetUrl().
- `getFile(id)` — fetch file metadata (no download).
- `updateFile(id, input)` — upload a new version; increments version number; stores previous version reference.
- `deleteFile(id)` — soft-delete (move to trash).
- `restoreFile(id)` — restore from trash.
- `moveFile(id, newFolderId)` — move to a different folder; recompute path.
- `renameFile(id, name)` — rename; recompute path.
- `listVersions(id)` — list all versions of a file.

**Constraints**:
- Allowed file types: configurable per deployment (default: all types).
- Maximum file size: configurable (default: 5 GB, limited by S3 multipart upload).
- File names: max 255 chars, no `/` or null bytes.
- Upload delegates to StorageUnit — the Drive module never writes to S3 directly.
- Version history retains the last N versions (configurable, default: 10); older versions are pruned.

### 1.3 Path Resolution

The materialized path pattern enables efficient lookups and breadcrumbs.

- Every file and folder stores its full path (e.g., `/projects/design/logo.svg`).
- `resolvePath(path)` — returns the file or folder at the given path, or null.
- `getBreadcrumbs(id)` — returns the ancestor chain from root to the item.
- `searchByPath(prefix)` — list all items whose path starts with a prefix (for folder listing).
- Path updates cascade: renaming or moving a folder recomputes paths for all descendants in a single transaction.

---

## 2. Labels

Flexible tagging system for cross-cutting categorization independent of folder structure.

### 2.1 Label

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Label text (e.g., `important`, `reviewed`, `client-acme`). |
| **Color** | text | Hex color for UI display. |
| **Owner** | text (FK) | User who created the label (personal labels) or null (org-wide). |
| **Is Global** | boolean | If `true`, visible to all users. Default `false`. |
| **Created At** | timestamptz | Record creation timestamp. |

### 2.2 Item Label (Join Table)

| Field | Type | Description |
|---|---|---|
| **Item ID** | text (FK) | Reference to file or folder. |
| **Item Type** | enum | `file` or `folder`. |
| **Label ID** | text (FK) | Reference to label. |
| **Applied At** | timestamptz | When the label was applied. |
| **Applied By** | text (FK) | User who applied the label. |

**Operations**:
- `createLabel(input)` — create a new label.
- `deleteLabel(id)` — delete label; cascade-remove all associations.
- `applyLabel(itemId, itemType, labelId)` — tag a file or folder.
- `removeLabel(itemId, itemType, labelId)` — remove a tag.
- `listLabels(opts?)` — list available labels (personal + global).
- `listByLabel(labelId, opts?)` — list all files and folders with a given label.

**Constraints**:
- A label can be applied to both files and folders (polymorphic join).
- Duplicate label application on the same item is prevented.
- Deleting a label removes all associations (no orphaned tags).

---

## 3. Storage Integration

All binary data operations are delegated to the platform's StorageUnit. The Drive module never accesses S3 directly.

### 3.1 Upload Flow

1. Client requests upload via Drive module with file content, name, target folder, and metadata.
2. Drive module computes the storage key: `{prefix}/{folder-path}/{filename}-{uuid}`.
3. Drive module calls `storageUnit.upload({ key, body, contentType, metadata })`.
4. On success, Drive module inserts the file record into its own `drive_file` table.
5. Drive module publishes `file:uploaded` event via PubSub.

### 3.2 Download Flow

1. Client requests download via Drive module with file ID.
2. Drive module looks up the file record, resolves the storage key.
3. Drive module calls `storageUnit.getSignedGetUrl(storageKey, { expiresIn })`.
4. Client receives a presigned URL and downloads directly from S3.

### 3.3 Delete Flow

1. Soft-delete: marks `is_trashed = true`; file remains in S3.
2. Hard-delete (purge from trash): calls `storageUnit.remove(storageKey)`, then deletes the DB record.
3. Bulk purge: a scheduled job permanently deletes trashed items older than N days (configurable, default: 30).

### 3.4 Copy & Move

- **Copy**: calls `storageUnit.copy(sourceKey, destKey)`, creates new file record.
- **Move**: calls `storageUnit.move(sourceKey, destKey)`, updates existing file record path.

---

## 4. Download Links

Generate time-limited download URLs for files and folders.

### 4.1 File Download Link

- `getDownloadLink(fileId, options?)` — returns a presigned GET URL.
- Options: `expiresIn` (default: 1 hour, max: 7 days).
- The URL is a standard S3 presigned URL generated by `storageUnit.getSignedGetUrl()`.
- Access check: caller must have at least `viewer` permission on the file (or the file must be publicly shared — see §5).

### 4.2 Folder Download (Archive)

- `getFolderDownloadLink(folderId, options?)` — generates a ZIP archive of the folder contents.
- Implementation: an async job that collects all files in the folder (recursively), streams them into a ZIP, uploads the ZIP to a temporary S3 key, and returns a presigned URL.
- Options: `expiresIn` (default: 1 hour), `includeSubfolders` (default: `true`).
- Large folders (>1000 files or >1 GB): the operation is queued; client polls for completion or receives a webhook callback.

---

## 5. Sharing & Public Links

### 5.1 Share

Direct sharing of files or folders with specific users or groups.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Item ID** | text (FK) | Reference to file or folder. |
| **Item Type** | enum | `file` or `folder`. |
| **Grantee ID** | text (FK) | User or group receiving access. |
| **Grantee Type** | enum | `user` or `group`. |
| **Permission** | enum | `viewer`, `editor`, `owner`. |
| **Shared By** | text (FK) | User who created the share. |
| **Message** | text (nullable) | Optional message sent with the share notification. |
| **Created At** | timestamptz | When the share was created. |
| **Expires At** | timestamptz (nullable) | Optional expiration; after this, access is revoked. |

**Operations**:
- `share(input)` — share a file or folder with a user or group.
- `updateShare(id, permission)` — change permission level.
- `removeShare(id)` — revoke access.
- `listShares(itemId, itemType)` — list all shares for an item.
- `listSharedWithMe(userId, opts?)` — list items shared with a specific user.

**Constraints**:
- Folder shares are inherited: sharing a folder grants access to all contents (files and sub-folders) unless explicitly overridden.
- Inherited permissions can be overridden at the item level (more permissive wins).
- Permission levels: `viewer` (read, download), `editor` (read, upload, rename, move), `owner` (full control including delete and reshare).
- Only `owner`-level users can delete an item or modify sharing settings.
- Share notifications are published via PubSub (see §7).

### 5.2 Public Link

Generate a publicly accessible URL for a file or folder, shareable with anyone (no account required).

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Item ID** | text (FK) | Reference to file or folder. |
| **Item Type** | enum | `file` or `folder`. |
| **Token** | text (unique) | Random URL-safe token (e.g., `a1b2c3d4e5f6`). Used in the public URL. |
| **Permission** | enum | `view` (preview/download), `edit` (upload allowed, folders only). |
| **Created By** | text (FK) | User who created the link. |
| **Password** | text (nullable) | Optional bcrypt-hashed password; required to access the link. |
| **Max Views** | integer (nullable) | Optional cap on number of views/downloads. |
| **View Count** | integer | Current view count. Default `0`. |
| **Expires At** | timestamptz (nullable) | Optional expiration; after this, the link is invalid. |
| **Is Active** | boolean | Can be deactivated without deleting. Default `true`. |
| **Created At** | timestamptz | Record creation timestamp. |

**Operations**:
- `createPublicLink(input)` — generate a public sharing link.
- `updatePublicLink(id, input)` — modify link settings (password, expiry, permission).
- `revokePublicLink(id)` — deactivate or delete the link.
- `listPublicLinks(itemId, itemType)` — list all public links for an item.
- `resolvePublicLink(token, password?)` — resolve a public link to the underlying item (for the consumer).

**Constraints**:
- Public links bypass normal permission checks; anyone with the token (and password, if set) can access.
- Token is cryptographically random (16 bytes, base64url-encoded).
- Password is hashed with bcrypt before storage; never stored in plaintext.
- For folder public links with `edit` permission, anonymous uploads are allowed (files owned by the link creator).
- Public link access is logged (IP, user-agent, timestamp) for audit.

---

## 6. Trash & Recovery

### 6.1 Trash

- Trashed items (files and folders) are moved to a virtual trash view, not immediately deleted.
- Trashed items retain their original path but are excluded from normal listings and search.
- `listTrash(opts?)` — list all trashed items for the current user.
- `restoreFromTrash(id)` — restore to original location (or root if parent was also trashed).
- `emptyTrash(userId?)` — permanently delete all trashed items for a user.

### 6.2 Auto-Purge

- A configurable retention period (default: 30 days) after which trashed items are permanently deleted.
- Permanent deletion: calls `storageUnit.remove(storageKey)` for each file, then deletes DB records.
- Purge runs as a scheduled job (via PubSub or cron).

---

## 7. Search

### 7.1 File & Folder Search

- `search(query, opts?)` — full-text search across file names, folder names, descriptions, and labels.
- Options: `scope` (all, my files, shared with me), `type` (file, folder, both), `labels` (filter by label IDs), `contentType` (filter by MIME type), `dateRange`, `sizeRange`, `owner`.
- Search is scoped to items the caller has permission to access.

---

## 8. Data Model Summary

| Domain | Key Tables |
|---|---|
| **Folders** | `drive_folder` |
| **Files** | `drive_file`, `drive_file_version` |
| **Labels** | `drive_label`, `drive_item_label` |
| **Sharing** | `drive_share` |
| **Public Links** | `drive_public_link` |
| **Access Log** | `drive_access_log` |

---

## 9. Dependencies & Prerequisites

| Dependency | Reason |
|---|---|
| **Storage Unit** | All binary file operations (upload, download, copy, move, delete, presigned URLs). |
| **Auth Unit** | User identity, roles, access control for sharing and ownership. |
| **PubSub Unit** | Event publishing (file uploaded, shared, trashed), scheduled jobs (auto-purge). |
| **DB Unit** | Drizzle ORM for all metadata tables. |
| **RPC Unit** | API exposure for client applications. |

**No optional module dependencies.** The Drive module is self-contained.

---

## 10. RBAC Model

### Roles

| Role | Description |
|---|---|
| **drive:admin** | Full access to all files and folders in the organization. Can manage sharing, purge trash, configure settings. |
| **drive:user** | Standard user. Can create, upload, share, and manage own files. Can access items shared with them. |
| **drive:viewer** | Read-only access. Can view and download files shared with them but cannot upload or modify. |

### Resource Permissions

| Action | drive:admin | drive:user | drive:viewer |
|---|---|---|---|
| Create folder | ✅ | ✅ | ❌ |
| Upload file | ✅ | ✅ (own) | ❌ |
| Download file | ✅ | ✅ (own + shared) | ✅ (shared) |
| Move / Rename | ✅ | ✅ (own) | ❌ |
| Delete (trash) | ✅ | ✅ (own) | ❌ |
| Restore from trash | ✅ | ✅ (own) | ❌ |
| Empty trash | ✅ | ✅ (own) | ❌ |
| Share | ✅ | ✅ (owner-level) | ❌ |
| Create public link | ✅ | ✅ (owner-level) | ❌ |
| View all files | ✅ | ❌ | ❌ |
| Purge expired | ✅ | ❌ | ❌ |

---

## 11. Out of Scope

- **Real-time collaboration**: simultaneous editing, cursors, presence indicators (Google Docs-style).
- **File preview / rendering**: in-browser preview of PDFs, images, videos, documents. Handled by the client application.
- **OCR / content indexing**: extracting text from images or PDFs for full-text search.
- **Version diffing**: visual comparison between file versions.
- **External cloud storage sync**: syncing with Google Drive, Dropbox, OneDrive.
- **Desktop sync client**: local filesystem synchronization.
- **End-to-end encryption**: client-side encryption before upload.
- **Custom metadata fields**: user-defined key-value metadata beyond the standard schema.
- **Audit log retention policy**: configurable retention is out of scope (handled at the infra level).
- **Multi-language file names**: Unicode normalization is handled by the filesystem layer, not the module.

---

## 12. Implementation Notes

### Module Structure

```
packages/drive/
├── index.ts                     # Module entry — implements Module interface
├── types.ts                     # Drive module types
├── db-schema.ts                 # Drizzle table definitions
├── workflows/
│   ├── folder.ts                # Folder CRUD, move, rename, path cascade
│   ├── file.ts                  # Upload, download, update, versioning
│   ├── label.ts                 # Label CRUD, apply/remove
│   ├── share.ts                 # Direct sharing operations
│   ├── public-link.ts           # Public link CRUD, resolution
│   └── trash.ts                 # Trash, restore, auto-purge
├── services/
│   ├── path-service.ts          # Path computation, resolution, breadcrumbs, cascade updates
│   ├── storage-bridge.ts        # StorageUnit integration (upload, download, presigned URLs)
│   ├── archive-service.ts       # ZIP generation for folder downloads
│   ├── search-service.ts        # Full-text search across drive items
│   └── access-service.ts        # Permission checks, share inheritance, public link access
└── event-map.ts                 # Drive domain events
```

### Domain Events

| Event | Payload | Trigger |
|---|---|---|
| `drive:folder_created` | `{ folder }` | Folder created |
| `drive:folder_renamed` | `{ folder, oldName }` | Folder renamed |
| `drive:moved` | `{ item, itemType, oldPath, newPath }` | File or folder moved |
| `drive:file_uploaded` | `{ file }` | File uploaded |
| `drive:file_updated` | `{ file, previousVersion }` | New version uploaded |
| `drive:file_downloaded` | `{ file, userId }` | File downloaded (audit) |
| `drive:shared` | `{ share }` | Item shared with user/group |
| `drive:unshared` | `{ shareId, itemId }` | Share revoked |
| `drive:public_link_created` | `{ publicLink }` | Public link generated |
| `drive:public_link_accessed` | `{ publicLink, ip, userAgent }` | Public link used (audit) |
| `drive:public_link_revoked` | `{ publicLinkId, itemId }` | Public link deactivated |
| `drive:trashed` | `{ itemId, itemType }` | Item moved to trash |
| `drive:restored` | `{ itemId, itemType }` | Item restored from trash |
| `drive:purged` | `{ itemId, itemType, storageKey }` | Item permanently deleted |

### Phase Sequencing

**Phase 1 — Core Filesystem**:
- Folder CRUD with path computation and cascade updates
- File upload via StorageUnit integration
- File download via presigned URLs
- File versioning (basic)
- Trash and restore

**Phase 2 — Organization**:
- Labels (CRUD, apply/remove, list by label)
- Search (file name, folder name, label filter)
- Folder download as ZIP archive
- Path resolution and breadcrumbs

**Phase 3 — Sharing & Access Control**:
- Direct sharing (user/group, permission levels)
- Share inheritance (folder → contents)
- Public link generation with token, password, and expiry
- Public link access logging
- RBAC integration with Auth unit

**Phase 4 — Polish & Scale**:
- Auto-purge scheduled job for expired trash items
- Bulk operations (bulk move, bulk delete, bulk label)
- Access log and audit trail
- Performance optimization (indexed queries, lazy path computation)
- Large folder ZIP handling (async job, progress tracking)

### Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Folder CRUD & Paths | Medium | Materialized path pattern, cascade updates, cycle detection. |
| File Upload/Download | Low | Thin wrapper over StorageUnit with metadata bookkeeping. |
| Versioning | Low | Version counter + optional version history table. |
| Labels | Low | Standard CRUD with polymorphic join table. |
| Sharing | Medium | Permission inheritance, override resolution, notification. |
| Public Links | Medium | Token generation, password hashing, access logging, expiry enforcement. |
| Folder ZIP Download | Medium | Streaming ZIP generation, async job for large folders. |
| Search | Medium | Full-text search with permission scoping and filters. |
| Trash & Auto-Purge | Low | Soft-delete flags + scheduled cleanup job. |
| RBAC | Low | Integration with Auth unit's access control system. |

### Testing Focus Areas

- **Path cascade**: rename/move a folder deep in the tree; verify all descendant paths update atomically.
- **Share inheritance**: share a folder, verify nested files and sub-folders inherit permissions; verify override at child level.
- **Public link security**: token uniqueness, password hashing, expiry enforcement, max-view cap.
- **Storage integration**: upload/download round-trip, presigned URL generation, error handling on S3 failures.
- **Trash lifecycle**: soft-delete, restore with original path, auto-purge after retention period.
- **Concurrent access**: two users moving the same item, simultaneous uploads to the same folder.
- **Large folder operations**: ZIP generation for 1000+ files, pagination of folder listings.
