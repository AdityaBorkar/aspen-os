# DMS (Document Management System) Module — Scope of Work

> Scope of Work for a structured document management module built on the `@aspen-os/platform`.

## Overview

The DMS module provides unified document/files management built on a **single `file` entity** (per `sow/dms-consolidation.md`): the class-first records system (Triage → Classify → active; classes, fields, versions, contacts, holds, retention, trash, file views, activity) and the free-form filesystem (folders, paths, labels, public links, shares) are consolidated onto one `dms_file` table. Every upload into a folder is **active** immediately; uploads staged for classification land in **Triage** and become active only after they are assigned to a **Class** whose mandatory fields have been filled. All binary storage is delegated to the platform's StorageUnit; DMS owns the indexing semantics — classes, fields, labels, metadata, versions, file views, contacts, sharing, search, retention, and the trash.

The module is the sole document-management module in the repository. It shares the StorageUnit and AuthUnit with the platform but owns its own tables, lifecycle, and semantics — the former `@aspen-os/drive` filesystem was consolidated into the single `file` entity per `sow/dms-consolidation.md` (§13).

### Key Architectural Decisions

1. **Compulsory indexing via a Triage gate.** No direct uploads into the active document store. Every upload (single or bulk) produces a triaged record capturing all input fields (class, tags, metadata, compression option). A document is not searchable, listable in normal views, or shareable until it is classified and all required class fields are satisfied.
2. **Document Classes provide the schema.** A class defines typed fields (with required flags), an optional file-naming schema, and is the only route to activate a triaged document. Classification is a first-class transition that validates required fields and applies the naming schema.
3. **Version-scoped storage keys.** Storage keys are `dms/{tenant}/{documentId}/v{n}/{name}` — version-bound, not name-bound. Renaming (including naming-schema application) is a metadata-only change; no S3 object move is required. This makes versioning natural and cheap (see §2.4).
4. **Expiry is a document lifecycle state, not just a date.** Documents carry an optional `expiryDate`; when it passes, the document's status is promoted to `expired` and it surfaces in the Recycle Bin alongside deleted documents. Restoring an expired document reactivates it.
5. **Contacts are an org-wide address book, not user-owned.** Contacts are the sharing handles for external parties; internal users are also valid share grantees. Removing a contact is mandatory-reason-gated and revokes every share granted to that contact.
6. **Retention is class-based; legal hold overrides everything.** Each class (plus a global default) defines how long deleted/expired documents are retained before auto-purge. A **legal hold** on a document blocks permanent deletion and auto-purge regardless of retention.
7. **Admin-only destructive authority.** Document Classes, retained settings, and legal holds are admin-managed; shared Views are published by admins; and only administrators may permanently delete documents from the Recycle Bin. Ordinary users may soft-delete their own documents and restore them.
8. **Audit-driven activity feeds.** Document activity (upload, classify, version, share, delete, restore, expire, purge, hold) is written inline to the platform's `AuditUnit`; the per-document activity feed is a projection over those entries. DMS events are published separately for cross-module integration.

---

## 1. Document Upload & Triage

### 1.1 Document

The central record. Every uploaded file becomes one Document.

| Field               | Type                   | Description                                                                                                    |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **ID**              | text (auto)            | System-generated unique identifier.                                                                            |
| **Document Number** | text (auto)            | Human-readable sequential number (e.g., `DOC-000123`).                                                         |
| **Name**            | text                   | Current file name, including extension. May be renamed when a file-naming schema is applied on classification. |
| **Version**         | integer                | Current version number (starts at 1). See §2.                                                                  |
| **Storage Key**     | text                   | S3 object key of the **current** version: `dms/{tenant}/{documentId}/v{version}/{name}`.                       |
| **Content Type**    | text                   | MIME type (e.g., `application/pdf`).                                                                           |
| **Size**            | bigint                 | File size in bytes of the current version.                                                                     |
| **ETag**            | text (nullable)        | S3 ETag of the current version for integrity verification.                                                     |
| **Class**           | text (FK, nullable)    | Assigned Document Class. `null` while in Triage.                                                               |
| **Status**          | enum                   | `triaged`, `active`, `expired`, `deleted`. See §1.4.                                                           |
| **Tags**            | text[]                 | Tag names applied directly on the document (indexed counterpart of the `dms_document_tag` join).               |
| **Metadata**        | jsonb                  | Free-form key/value metadata captured at upload or patched later.                                              |
| **Field Values**    | jsonb                  | Values for the assigned class's fields (validated against the class schema).                                   |
| **Compression**     | jsonb (nullable)       | Per-document compression/optimization override. `null` = use org default. See §1.3.                            |
| **Batch ID**        | text (nullable)        | Groups files uploaded in a single bulk-upload request.                                                         |
| **Owner**           | text (FK)              | User who uploaded the document.                                                                                |
| **Uploaded By**     | text (FK)              | User who performed the upload (may differ from owner in delegated flows).                                      |
| **Expiry Date**     | date (nullable)        | Optional expiry. When passed, status promotes to `expired` (see §6.1).                                         |
| **Expired At**      | timestamptz (nullable) | When the document became expired.                                                                              |
| **Deleted At**      | timestamptz (nullable) | When the document was moved to the Recycle Bin.                                                                |
| **Deleted By**      | text (FK, nullable)    | Who soft-deleted the document.                                                                                 |
| **Created At**      | timestamptz            | Record creation timestamp.                                                                                     |
| **Updated At**      | timestamptz            | Last modification timestamp.                                                                                   |

**Operations**:

- `upload(input)` — single upload. Accepts bytes (or a presigned upload once StorageUnit returns a URL), filename, content type, and optional tags, metadata, and compression override. Writes `v1`.
- `uploadBulk(inputs)` — bulk upload. Accepts an array of single-upload inputs; each becomes its own triaged Document sharing a `batchId`.
- `get(id)` — fetch current document state (no download).
- `download(id)` / `getDownloadUrl(id, expiry?)` — presigned GET URL for the **current** version via StorageUnit.
- `update(id, patch)` — rename, patch metadata/tags/compression on a triaged document, or patch non-schema metadata on an active one.
- `tag(id, tagName)` / `untag(id, tagName)` — apply/remove tags.
- `addMetadata(id, key, value)` / `removeMetadata(id, key)` — patch the metadata bag.
- `delete(id)` — soft-delete (moves to Recycle Bin; see §6).

**Constraints**:

- No upload is inserted directly into the active document set. The initial (and only automatic) status is `triaged`.
- Uploaded bytes are written once per version. Classification that applies a file-naming schema renames metadata only — no S3 object move (see §2.4).
- Max file size, allowed content types, max versions, and default compression are configurable per module config (defaults: 5 GB, all types, 10 versions, org default below).
- Triaged documents are visible in the Triage list (§1.2) and to admins only from normal search/views (§4 normalizes them out).

### 1.2 Triage

A first-class workspace stage, not a folder. It lists every Document whose status is `triaged`.

- `listTriage(filters?)` — list triaged documents with the input fields already captured (tags, metadata, compression).
- `getTriageDetail(id)` — full triaged record including missing required-field report for candidate classes.
- `classify(id, classId, fieldValues)` — commit the document to a class. Validates that every required field of the class is present and valid (see §3); on success, sets status `active`, applies the class's file-naming schema (if defined), stores `fieldValues`, and publishes `dms:document_classified`.
- `delete(id)` — soft-delete from Triage (owner or admin).
- Triage can be pinned to the sidebar by any user (see §7).

**Flow**: Upload → (fill/patch tags, metadata, compression) → classify → active. A triaged document carries no class until classified; classification is the only transition out of Triage.

### 1.3 Compression Options

Compression is interpreted as "file compression/optimization" applied when a version is written to storage.

- **Org-level default** — stored in the module settings table (`dms_setting`, key `defaultCompression`) and used for every upload that does not specify an override. Managed by admins (see §9).
- **Per-upload override** — an optional `compression` object on each upload input, on the Document record, and on each new version.

```ts
type CompressionOption = {
  mode: "none" | "archive" | "image" | "pdf"; // archive = ZIP, image = re-encode, pdf = optimize
  quality?: number; // e.g., 0-100 for image/pdf
  format?: string; // e.g., "zip", "jpeg", "webp", "pdf/a"
  enabled: boolean; // soft switch; false = store as-is
};
```

- Compression runs as a post-upload step (inline service call or async job for large files) and never fails the upload — the original bytes are kept on failure and the version is flagged `compression: { enabled: false, reason }`.
- Compression is applied per version: a `newVersion` upload may use a different override than the document default.
- The module never re-uploads; compression produces the stored object key content.

---

## 2. Document Versions & Revisions

Version control: every new upload of the same document creates the next revision; the current revision is what normal reads/share resolves to.

### 2.1 Version

| Field            | Type             | Description                                                                     |
| ---------------- | ---------------- | ------------------------------------------------------------------------------- |
| **ID**           | text (auto)      | System-generated unique identifier.                                             |
| **Document**     | text (FK)        | Owning Document.                                                                |
| **Version**      | integer          | 1-based revision number; unique per document.                                   |
| **Storage Key**  | text             | S3 object key `dms/{tenant}/{documentId}/v{version}/{name}`.                    |
| **Name**         | text             | File name at the time this version was written.                                 |
| **Content Type** | text             | MIME type of this version.                                                      |
| **Size**         | bigint           | Bytes of this version.                                                          |
| **ETag**         | text (nullable)  | S3 ETag of this version.                                                        |
| **Compression**  | jsonb (nullable) | Compression option applied to this version.                                     |
| **Uploaded By**  | text (FK)        | User who created the version.                                                   |
| **Is Current**   | boolean          | Mirrors the current `version` on the Document row (denormalized for fast join). |
| **Created At**   | timestamptz      | Version creation timestamp.                                                     |

### 2.2 Operations

- `newVersion(documentId, input)` — upload new bytes as `version + 1`; saves the previous current into `dms_document_version` history, updates the Document row (current `version`, storage key, size, etag, contentType, name, `updatedAt`). Publishes `dms:document_version_added`.
- `getCurrentVersion(id)` / `listVersions(id)` — current-revision read and full history.
- `getVersion(documentId, version)` — download URL for a specific revision.
- `revertToVersion(documentId, version)` — promote a historical revision to current by creating a new current entry whose storage key/content fields are copied from the target version. The Document's `version` counter keeps incrementing (no reuse). Publishes `dms:document_version_reverted`.
- `deleteVersion(documentId, version)` — owner/admin; cannot delete the current version (revert-then-delete). Purges that revision's S3 object. Retains at least one version.

### 2.3 Constraints

- Maximum versions retained: configurable (`maxVersions`, default 10). On `newVersion`, the oldest version beyond the cap is pruned (S3 object removed + row deleted). **A version under an active legal hold is never pruned** (see §6.3).
- Classification, tagging, and metadata apply at the **document** level and hold across all versions. File-naming schema and class field values describe the current version's content.
- A document's version history is never exposed before classification; triaged documents have exactly one version.
- Purge (permanent delete) removes **all** version objects and rows.

### 2.4 Storage Key & Rename

- Key layout is `dms/{tenant}/{documentId}/v{n}/{safeName}` — **version-bound, not name-bound**.
- Renaming a document (manually or via a file-naming schema on classify) is a metadata-only update on the current version record and document row; no S3 `move` is required. Historical versions keep their original names.
- `safeName` strips path separators and null bytes.

---

## 3. Document Classes

### 3.1 Document Class

A template that defines the schema a Document must satisfy before it becomes active in that class.

| Field                  | Type               | Description                                                                                |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| **ID**                 | text (auto)        | System-generated unique identifier.                                                        |
| **Name**               | text               | e.g., `Invoice`, `Certificate`, `Board Resolution`.                                        |
| **Description**        | text (nullable)    | Purpose / guidance shown when classifying.                                                 |
| **Color**              | text (nullable)    | Hex color for UI display.                                                                  |
| **Icon**               | text (nullable)    | Icon identifier for UI display.                                                            |
| **File Naming Schema** | text (nullable)    | Optional filename template; see §3.3.                                                      |
| **Retention Days**     | integer (nullable) | Retention period for deleted/expired documents (overrides the settings default). See §6.2. |
| **Is Active**          | boolean            | `false` archives the class (existing documents unaffected). Default `true`.                |
| **Created By**         | text (FK)          | Admin who created the class.                                                               |
| **Created At**         | timestamptz        | Record creation timestamp.                                                                 |
| **Updated At**         | timestamptz        | Last modification timestamp.                                                               |

Management is admin-only (`dms:admin`).

### 3.2 Class Field

A typed column of a Document Class.

| Field                 | Type             | Description                                                                                                |
| --------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **ID**                | text (auto)      | System-generated unique identifier.                                                                        |
| **Class**             | text (FK)        | Owning Document Class.                                                                                     |
| **Name**              | text             | Unique field key within the class (e.g., `invoiceNumber`).                                                 |
| **Label**             | text             | Display label (e.g., `Invoice Number`).                                                                    |
| **Type**              | enum             | `text`, `number`, `date`, `select`, `multi-select`, `boolean`, `user`, `contact`, `url`, `email`, `phone`. |
| **Is Required**       | boolean          | Must be filled before a Document can be classified into the class. Default `false`.                        |
| **Include In Search** | boolean          | Whether this field's values are indexed for full-text search. Default `true`.                              |
| **Default Value**     | jsonb (nullable) | Auto-filled value when not provided.                                                                       |
| **Options**           | jsonb (nullable) | For `select` / `multi-select`: the list of allowed values.                                                 |
| **Sort Order**        | integer          | Display/validation order.                                                                                  |
| **Is Active**         | boolean          | Inactive fields are hidden from the classify form but their stored values are preserved.                   |

### 3.3 File Naming Schema

Optional per-class filename template evaluated with the document's field values at classification time.

- Placeholders: `{field:<name>}`, `{class}`, `{docNumber}`, `{date}`, `{date:yyyy}`, `{date:MM}`, `{seq}` (a zero-padded per-class sequence).
- Example: `{class}_{docNumber}_{field:einvoiceno}-{date:yyyy}.pdf`.
- Applied as a metadata-only rename of the current version (see §2.4 — no S3 move). Unresolved placeholders resolve to a safe fallback (`_`); the result strips path separators and null bytes.
- Once applied, classification commits the final name.

### 3.4 Operations & Constraints

- `createClass(input)` / `updateClass(id, patch)` / `archiveClass(id)` — admin-only. Delete is disallowed while the class has active or expired documents; use `archive`.
- `getClass(id)` / `listClasses(filters?)` — readable by all users (needed to fill the classify form).
- `addField(classId, field)` / `updateField(id, patch)` / `deactivateField(id)`.
- Adding a new **required** field does not back-fill existing active documents; it applies to newly classified documents.
- Changing a field's type is blocked if field values already exist in that column; deactivate-then-recreate instead.
- A class cannot be archived if it is currently referenced by a triaged document.

---

## 4. Document Views & Search

### 4.1 Document View

Saved, reusable **filter + sort** configurations over active (and optionally expired) documents. Models a superset of the tasks `savedView` pattern, extended with class-field conditions and free-text search terms.

| Field                           | Type        | Description                                                 |
| ------------------------------- | ----------- | ----------------------------------------------------------- |
| **ID**                          | text (auto) | System-generated unique identifier.                         |
| **Name**                        | text        | e.g., `Invoices due this month`.                            |
| **Owner**                       | text (FK)   | User who created the view.                                  |
| **Filters**                     | jsonb       | Array of conditions; see below.                             |
| **Sort**                        | jsonb       | Array of `{ field, direction }`.                            |
| **Is Default**                  | boolean     | Auto-applied view for the owner. Default `false`.           |
| **Is Shared**                   | boolean     | Admin-published view visible to all users. Default `false`. |
| **Is Pinned**                   | boolean     | Pinned to the owner's sidebar. Default `false`.             |
| **Created At** / **Updated At** | timestamptz | Record timestamps.                                          |

**Condition model** (over document columns, class fields, and search):

- Document-level fields: `class`, `status`, `tag`, `owner`, `uploadedBy`, `size`, `contentType`, `createdAt`, `updatedAt`, `expiryDate`, metadata keys.
- Class fields: `classField:<name>` — any field of the target class (e.g., `classField:invoiceNumber`).
- Operators: `eq`, `neq`, `contains`, `notContains`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `between`, `isEmpty`, `isNotEmpty`, `dateBefore`, `dateAfter`, and `search` (free-text term run through the full-text index, see §4.2).

**Operations**:

- `createView(input)` — any user; `isShared` allowed only for admins.
- `updateView(id, patch)` — owner, or admins for shared views.
- `deleteView(id)` — owner, or admins for shared views.
- `pinView(id, pinned)` / `setDefaultView(id)`.
- `applyView(input)` — resolves a view (by ID or ad-hoc filter/sort) into a document listing, normalizing out triaged/deleted documents unless explicitly filtered.

**Constraints**:

- Views never expose triaged or deleted documents unless the view explicitly targets `status = triaged|deleted` (deleted only to admins).
- Deleting a class or deactivating a field quietly drops the corresponding view conditions.

### 4.2 Full-Text & Quick Search

Smart search over document metadata and class fields, scoped to the caller's visibility.

- **Full-text search**: `search(query, opts?)` across current-version `name`, `tags`, `metadata` (scalar values), and class `fieldValues` (respecting `Include In Search`). Options: `scope` (all, mine, shared with me / contacts), `classId`, `tags`, `status` (defaults to active), `contentType`, `dateRange`, `sizeRange`, `sort`, `page`/`limit`.
- **Quick search**: `quickSearch(query, limit?)` — type-ahead form returning up to N documents with the matched field highlighted (field name + matching value), plus matching classes and tags for completion. Feed straight into the view builder (see below).
- **Promote to view**: `createView` accepts the query + options from a search as its initial filters (including a `search` condition), so a good search becomes a persisted sidebar view in one step.
- **Scope & visibility**: search only returns documents the caller may access — owner, grants to the caller, org-wide for `dms:admin`, plus any `active` document shared to a contact the caller manages (match by `linkedUser`).

**Implementation**: a `tsvector` on the Document row (name + tags + metadata + fieldValues of the current version) with a GIN index, generated/maintained by the search service. Content (OCR) is explicitly out of scope (§14.4) — the index covers catalogued fields only, distinct from the item filesystem's own search (`p.dms.driveSearch`).

---

## 5. Contacts

### 5.1 Contact

An org-wide address-book entry used to share files with external parties (and linked to internal users where applicable).

| Field               | Type                   | Mandatory          | Description                                                                                  |
| ------------------- | ---------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| **ID**              | text (auto)            | auto               | System-generated unique identifier.                                                          |
| **First Name**      | text                   | ✅                 | Contact's first name.                                                                        |
| **Last Name**       | text                   | ✅                 | Contact's surname.                                                                           |
| **Email**           | text                   | ✅                 | Email (shared org-uniqueness).                                                               |
| **Phone**           | text                   | ✅                 | Phone number.                                                                                |
| **Company Name**    | text                   | ✅                 | Organization they belong to.                                                                 |
| **Designation**     | text                   | ✅                 | Role/title at that company.                                                                  |
| **Deletion Reason** | text                   | required on delete | Why the contact is being removed; optional on create/update.                                 |
| **Linked User**     | text (FK, nullable)    | —                  | Optional link to an internal `AuthUnit` user when the contact represents a platform account. |
| **Created By**      | text (FK)              | auto               | User who added the contact.                                                                  |
| **Is Removed**      | boolean                | auto               | `true` after deletion (soft).                                                                |
| **Removed At**      | timestamptz (nullable) | —                  | When the contact was removed.                                                                |

**Operations**:

- `createContact(input)` — all 6 business fields mandatory.
- `updateContact(id, patch)` — any field except `deletionReason`.
- `removeContact(id, reason)` — `deletionReason` is **mandatory**; marks `isRemoved = true` and revokes every share granted to this contact (see §5.3). The contact hides from listings via the `dms:contact:delete` action audit.
- `getContact(id)` / `listContacts(filters?)` — org-wide.

### 5.2 Sharing to Contacts & Users

Sharing grants a grantee access to a Document.

| Field            | Type                   | Description                                                                                         |
| ---------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| **ID**           | text (auto)            | System-generated unique identifier.                                                                 |
| **Document**     | text (FK)              | Shared document (**current version** is what a grant resolves to).                                  |
| **Grantee Type** | enum                   | `contact` (external, no login) or `user` (internal AuthUnit user).                                  |
| **Grantee ID**   | text (FK)              | Contact ID or User ID.                                                                              |
| **Permission**   | enum                   | `viewer` (view/download) or `editor` (also add/remove tags, metadata, and new versions; no delete). |
| **Share Token**  | text (nullable)        | Access token for `contact` grantees (see below).                                                    |
| **Shared By**    | text (FK)              | User who created the share.                                                                         |
| **Expires At**   | timestamptz (nullable) | Optional expiry.                                                                                    |
| **Created At**   | timestamptz            | Share creation timestamp.                                                                           |

- `createShare(input)` — share a document with a contact or internal user.
- `updateShare(id, patch)` — change permission/expiry.
- `removeShare(id)` — revoke access.
- `listShares(documentId)` / `listSharedWithGrantee(granteeType, granteeId)` — enumerate grants.

**Contact grant semantics** (no login required): sharing to a contact creates a `Share` with a `shareToken` (16 bytes, base64url). The contact (or anyone holding the token) can download via a token-resolved download endpoint. Revoking the share or removing the contact invalidates the token immediately.

**Internal-user grant semantics**: sharing to a `user` grants access within normal authenticated visibility (document appears in the user's listings and downloads).

### 5.3 Contact Removal Cascade

`removeContact(id, reason)`:

1. Validates `reason` is non-empty.
2. Marks `isRemoved = true` with `removedAt`.
3. Deletes every `dms_share` referencing the contact (hard revoke — access stops immediately).
4. Publishes `dms:contact_removed` and a `dms:contact:delete` audit entry with `reason`.

---

## 6. Recycle Bin, Retention & Legal Hold

The Recycle Bin is a read-mostly view over documents whose status is `deleted` **or** `expired`. Permanent deletion is **admin-only** and is subject to retention and legal hold.

### 6.1 Document Lifecycle

```
upload ──▶ triaged ──classify──▶ active ──▶ expired  (expiryDate passed)
                │                  │
                └──── delete ──────┘──── deleted ──retention passes ──▶ auto-purge
                                          │  │
                                  restore │  └── (legal hold: purge blocked)
                                          ▼
                                       active
```

- `deleted`: set by `DocumentWorkflow.delete()` (owner or admin). Record kept, status `deleted`, excluded from normal listings/search.
- `expired`: derived state, set actively (not via trigger) by the expiry scanner — a scheduled pg-boss cron (daily, configurable) that promotes documents past their `expiryDate` to `expired` and publishes `dms:document_expired`. An `expired` document never silently becomes active again; activation happens via explicit restore.

### 6.2 Retention & Auto-Purge

- **Retention period**: `retentionDays` on the Document Class (overrides the `defaultRetentionDays` setting). Documents without a class (e.g., deleted while triaged) use the default. Retention counts from `deletedAt` or `expiredAt`.
- **Auto-purge**: a scheduled job (`dms:auto-purge`, daily, interval configurable via settings) permanently deletes `deleted`/`expired` documents whose retention period has passed — calling `storageUnit.remove` for **every** version object, then deleting the rows and cascading tags, shares, pins, field values, and version history. Publishes `dms:document_purged` per document.
- **Auto-purge skips any document on an active legal hold** (§6.3) and never touches triaged/active documents.
- Auto-purge requires no ACL — it is a system job. Emptying the bin on demand (`emptyBin`) remains admin-only.

### 6.3 Legal Hold

A legal-hold is an admin-placed flag that blocks destruction of a document for compliance/discovery purposes.

| Field           | Type                   | Description                                                         |
| --------------- | ---------------------- | ------------------------------------------------------------------- |
| **ID**          | text (auto)            | System-generated unique identifier.                                 |
| **Document**    | text (FK)              | Held document.                                                      |
| **Reason**      | text                   | Mandatory justification (e.g., case reference, regulatory request). |
| **Placed By**   | text (FK)              | Admin who placed the hold.                                          |
| **Placed At**   | timestamptz            | When the hold was placed.                                           |
| **Released By** | text (FK, nullable)    | Admin who released the hold.                                        |
| **Released At** | timestamptz (nullable) | When the hold was released (clears when null).                      |

- `placeHold(documentId, reason)` / `releaseHold(holdId)` — **admin-only**; one active hold per document (re-placing while active updates reason).
- **Effect while active**: `deletePermanently(id)` and `emptyBin(...)` reject the document; auto-purge skips it; versions past `maxVersions` are also never pruned. Soft-delete and restore remain allowed (data is preserved either way).
- Documents under an active hold surface in the Recycle Bin with a `held: true` flag and hold metadata so operators know why purge is skipped.
- Hold placements/releases are audit entries (`dms:document_hold_placed` / `dms:document_hold_released`) and published events.

### 6.4 Recycle Bin Operations

- `list(filters)` — `deleted` and `expired` documents (with provenance), retained class/fields, deletion/expiry timestamps, and `held` flag. Non-admins see only records they can restore.
- `restore(id)` — `deleted` → `active` (retained class, fields, tags, version history); `expired` → `active` (document returns to the active set; optionally with a renewed `expiryDate` supplied at restore). Publishes `dms:document_restored`.
- `deletePermanently(id)` — **admin only**; rejected while an active legal hold exists. Frees all version objects, deletes rows, cascades tags, shares, pins, field values, and version history. Publishes `dms:document_purged`.
- `emptyBin(filters?)` — admin only; bulk `deletePermanently` over matching, non-held bin items.

---

## 7. Pinning to Sidebar

Both Triage and Document Views (and optionally classes) can be pinned to a user's sidebar. Pinning is per-user, orthogonal to ownership.

| Field          | Type        | Description                          |
| -------------- | ----------- | ------------------------------------ |
| **User**       | text (FK)   | User whose sidebar contains the pin. |
| **Item Type**  | enum        | `triage`, `view`, `class`.           |
| **Item ID**    | text (FK)   | Referenced item.                     |
| **Sort Order** | integer     | Render order in the sidebar.         |
| **Created At** | timestamptz | Pin creation timestamp.              |

- `pinItem(userId, itemType, itemId)` / `unpinItem(...)` / `listPinned(userId)`.
- Deleting a view, archiving a class, or deleting a document removes stale pins.

---

## 8. Storage & Download Flows

All binary operations delegate to StorageUnit (S3-compatible); the module never writes to S3 directly.

### 8.1 Upload

1. Client calls `upload*` / `newVersion` with bytes/stream, filename, content type, tags, metadata, compression override.
2. DMS resolves the compression option (override, else org default) and computes the storage key `dms/{tenant}/{documentId}/v{n}/{name}` (see §2.4).
3. DMS delegates upload to `storageUnit.upload(...)`; inserts/updates the Document (and version history) with the returned etag/size.
4. Compression/optimization step runs per §1.3; original bytes remain on failure.
5. Publishes `dms:document_uploaded` (with `batchId` for bulk) or `dms:document_version_added`.

### 8.2 Download

1. Resolve document → current version's storage key; enforce permission (owner, viewer/editor share, or share token).
2. `storageUnit.getSignedGetUrl(storageKey, { expiresIn })` → presigned URL (default 1 h, max 7 d).
3. Token-granted downloads (`contact` shares) are resolved via the `dms:share:resolve` workflow, which checks the share record, expiry, and active document status, then issues the same presigned URL.
4. Download may be logged to the activity feed only when the `logDownloads` setting is enabled (default off, to control feed volume).

### 8.3 Rename & Versioning

- Current-version renames (manual or naming-schema) are metadata-only — no S3 move (see §2.4).
- Version prune (beyond `maxVersions`) and document purge call `storageUnit.remove` for the affected objects.

---

## 9. Module Settings

Org-level defaults, stored as key/value JSON in a `dms_setting` table; admin-managed.

| Key                         | Example Value                     | Used By                                       |
| --------------------------- | --------------------------------- | --------------------------------------------- |
| `defaultCompression`        | `{ mode: "none", enabled: true }` | §1.3 uploads without an override              |
| `presignedUrlDefaultExpiry` | `3600`                            | download URL default (seconds)                |
| `presignedUrlMaxExpiry`     | `604800`                          | max download URL expiry                       |
| `defaultRetentionDays`      | `180`                             | §6.2 retention when the class sets none       |
| `autoPurgeEveryHours`       | `24`                              | §6.2 auto-purge cron cadence                  |
| `logDownloads`              | `false`                           | §8.2 whether downloads write activity entries |

- `getSetting(key)` / `setSetting(key, value)` — read any user (for client prefill), write admin-only.

---

## 10. Activity Feed

Audited action trail, per document (and, optionally, per contact/class).

### 10.1 Model

- Backed by the platform's `AuditUnit` (the cross-module `audit_log` table), written **inline** by each DMS workflow via `ctx.audit.write(entry)` — consistent with the compliance and management modules.
- Entry shape: `entityType` (`dms:document`, `dms:contact`, `dms:class`, `dms:share`, `dms:view`), `entityId`, `action`, `actorId`, `performedAt`, `previousState`/`newState`/`changes` (e.g., field values before/after classify), `metadata` (e.g., `version`, `reason`, `batchId`).
- DMS events are published separately on PubSub for cross-module consumers; the activity feed reads AuditUnit, not pubsub.

### 10.2 Feed Content

| Action                               | When                     | Notes                                 |
| ------------------------------------ | ------------------------ | ------------------------------------- |
| `uploaded`                           | Upload / bulk upload     | metadata: `batchId`, `version: 1`     |
| `classified`                         | Triage classify          | changes: class + field values applied |
| `version_added` / `version_reverted` | §2.2                     | metadata: `version`                   |
| `updated`                            | Rename / metadata / tags | changes diff                          |
| `expired`                            | Expiry scanner           | metadata: `expiryDate`                |
| `deleted`                            | Soft delete              | metadata: `deletedBy`                 |
| `restored`                           | §6.4                     |                                       |
| `purged`                             | §6.4 / auto-purge        | metadata: `storageKey`                |
| `hold_placed` / `hold_released`      | §6.3                     | metadata: `reason`                    |
| `shared` / `share_revoked`           | §5.2                     | metadata: grantee, permission         |
| `contact_removed`                    | §5.3                     | reason                                |
| `downloaded`                         | §8.2                     | only when `logDownloads` = true       |

### 10.3 Operations

- `getActivity(entityType, entityId, opts?)` — chronological feed (ordered by AuditUnit `seq`), paged, over the caller's visible scope.
- `getDocumentActivity(documentId, opts?)` / `getClassActivity(classId, opts?)` convenience projections.
- No DMS-owned activity table; activity integrity and ordering come from the platform AuditUnit.

---

## 11. Data Model Summary

| Domain                 | Key Tables                                            |
| ---------------------- | ----------------------------------------------------- |
| **Documents & Triage** | `dms_document`                                        |
| **Versions**           | `dms_document_version`                                |
| **Classes**            | `dms_document_class`, `dms_class_field`               |
| **Tags**               | `dms_tag`, `dms_document_tag`                         |
| **Views**              | `dms_view`                                            |
| **Retention & Hold**   | `dms_legal_hold` (retention days on class + settings) |
| **Contacts**           | `dms_contact`                                         |
| **Sharing**            | `dms_share`                                           |
| **Sidebar Pins**       | `dms_pin`                                             |
| **Settings**           | `dms_setting`                                         |

**12 tables**, all in tenant schemas (no control-plane tables). IDs are `text` with `.primaryKey().$defaultFn(uuidv7)`; timestamps `TIMESTAMPTZ` (`withTimezone: true`).

---

## 12. Dependencies & Prerequisites

| Dependency       | Reason                                                                            |
| ---------------- | --------------------------------------------------------------------------------- |
| **Storage Unit** | All binary operations: upload, presigned URLs, version prune/purge removes.       |
| **Auth Unit**    | User identity, ownership, internal-user share grantees, RBAC (`applyModuleAcl`).  |
| **PubSub Unit**  | Document/class/contact/share events; scheduled expiry-scanner + auto-purge crons. |
| **DB Unit**      | Drizzle ORM for all metadata tables.                                              |
| **Audit Unit**   | Activity feed (§10), hold/reason audit entries (§6.3), deletion provenance.       |

**No module dependencies.** Deliberately independent of any other module. Optional future integration points: `@aspen-os/organization` sharing contacts-by-link, `@aspen-os/compliance` for expiry-driven verification.

---

## 13. Relationship to the Drive Module

> **Drive no longer exists.** `@aspen-os/drive` was **removed from the repository** in Aug 2026 (Phase 1 of `sow/dms-consolidation.md`); Phases 2–7 then consolidated the filesystem and records system onto a single `file` entity. This section is retained as a historical record.

- **The Drive feature surface now lives inside DMS.** Drive's free-form filesystem (folders, files, labels, public links, shares, trash, path/access/archive/search/storage services) was ported into DMS and consolidated with the records system (per `sow/dms-consolidation.md`): one `dms_file` entity, one label mechanism (`dms_label` + `dms_entity_label`), one sharing group (`p.dms.shares` — grants + public links over `dms_share`/`dms_public_link`), one trash module (`p.dms.trash` over `status`), `fileViews` terminology, and single `pubsub.ts`/`enums.ts` surfaces.
- **DMS is the single document-management module.** There is no `document` entity, no `item-` prefix, no tags, no `view` term, and no `dms:item_*`/`dms:view_*` events — the consolidation is complete.
- **Shared platform, distinct tables.** Both surfaces use StorageUnit (unified `dms/{tenant}/{fileId}/v{n}/{name}` keys), AuthUnit, PubSub, DB, and Audit units.

---

## 14. Out of Scope

### 14.1 Client UI

- **Client UI** (sidebar pinning, upload/drag-and-drop screens, bin screens, class designer). This SOW scopes `@aspen-os/dms` (backend module only); the TanStack Start app is a separate workstream.

### 14.2 Deferred DMS-specific features (todo/dms.md)

- **File preview / rendering**: in-browser preview of PDFs, images, documents. Client concern.
- **OCR / text extraction** for full-text search of file contents — the §4 index covers catalogued fields only.
- **Resumable uploads (tus.io)** — noted in todo/dms.md; deferred.
- **Adobe-style document features**: doc merge, doc split, export-as, share-link-with-password — deferred to a later SOW.
- **Sub-domain–per-tenant login / admin-panel settings UI** — the module exposes `dms_setting` but not the multi-subdomain routing concern.

### 14.3 Deferred at scope-cut (considered, not selected)

> These were surfaced from the Krystal DMS comparison but deliberately left out of this SOW; they are candidate Phase-6+ work. Recording them here keeps the boundary explicit.

- **Approval workflows & task inbox** — classification/activation gated behind a designated approver; assignees get a unified task inbox with pubsub notifications. Reaches into Triage/Classify semantics and needs its own state machine.
- **Auto-indexing / auto-tagging rules on classify** — Krystal's capture rules that prefill class/fields/tags from file type, name, or metadata at classify time.
- **Electronic signatures** and **document transmittal tracking** (Krystal Enterprise).
- **AI-powered discovery / e-discovery** — semantic search, summarization, related-record suggestion.
- **Enterprise connectors** — ERP/CRM/HRMS/SharePoint bi-directional sync.
- **Collaborative annotation tools** (highlight, blackout, sticky notes) and concurrent edit locks.

### 14.4 Other

- **Real-time collaboration** and **audit retention policy** (handled at the infra level).

---

## 15. Implementation Notes

### Module Structure

```
packages/dms/
├── index.ts                     # DmsModule entry — implements Module interface
├── types.ts                     # DMS module types (row types, config)
├── db-schema.ts                 # Drizzle table definitions (12 tables + enums)
├── event-map.ts                 # DMS domain events
├── schemas/
│   ├── index.ts                 # Barrel re-exports
│   ├── enums.ts                 # Valibot enum schemas (status, field type, grantee, permission, pin type)
│   ├── document.ts              # Upload/create/update/classify/version schemas
│   ├── class.ts                 # Class + field + naming-schema schemas
│   ├── view.ts                  # View + condition + sort schemas
│   ├── contact.ts               # Contact + removal-reason schemas
│   ├── share.ts                 # Share schemas
│   └── utils.ts                 # Shared validators
├── workflows/
│   ├── document.ts              # upload, uploadBulk, get, download, update, tag/untag, metadata, delete
│   ├── triage.ts                # listTriage, getTriageDetail, classify (validates class fields + naming)
│   ├── version.ts               # newVersion, listVersions, getVersion, revertToVersion, deleteVersion (prune)
│   ├── class.ts                 # class + field CRUD, archive
│   ├── view.ts                  # view CRUD, pin, apply (seeds from search)
│   ├── search.ts                # full-text + quick search (promote to view)
│   ├── contact.ts               # contact CRUD + removal cascade
│   ├── share.ts                 # share create/update/revoke, token resolution
│   ├── recycle-bin.ts           # list, restore, deletePermanently (admin, hold-check), emptyBin
│   ├── hold.ts                  # placeHold / releaseHold (admin) + retention resolution
│   └── settings.ts              # get/set setting
└── services/
    ├── classify-service.ts      # required-field validation, naming-schema render (metadata rename)
    ├── compression-service.ts   # compression/optimization step (mode resolution, run, safe-fail)
    ├── condition-service.ts     # View condition → drizzle SQL (mirrors tasks filter-engine)
    ├── search-service.ts        # tsvector maintenance, full-text + quick search, promotion to view
    ├── expiry-scanner.ts        # scheduled cron: promote expired documents, publish events
    └── purge-service.ts         # retention resolution + auto-purge (skip holds), version prune
```

### Domain Events

| Event                                                                 | Payload (summary)                                      | Trigger                       |
| --------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------- |
| `dms:document_uploaded`                                               | `{ documentId, batchId?, version, size, contentType }` | Upload / bulk upload          |
| `dms:document_version_added`                                          | `{ documentId, version }`                              | New version                   |
| `dms:document_version_reverted`                                       | `{ documentId, version }`                              | Revert                        |
| `dms:document_classified`                                             | `{ documentId, classId, docNumber }`                   | Triage classify               |
| `dms:document_updated`                                                | `{ documentId, changes }`                              | Metadata/tags/rename          |
| `dms:document_expired`                                                | `{ documentId, expiryDate }`                           | Expiry scanner                |
| `dms:document_deleted`                                                | `{ documentId, deletedBy }`                            | Soft delete                   |
| `dms:document_restored`                                               | `{ documentId }`                                       | Recycle Bin restore           |
| `dms:document_purged`                                                 | `{ documentId, storageKey }`                           | Permanent delete / auto-purge |
| `dms:document_hold_placed` / `dms:document_hold_released`             | `{ documentId, reason }`                               | Legal hold mutations          |
| `dms:document_tagged` / `dms:document_untagged`                       | `{ documentId, tag }`                                  | Tag apply/remove              |
| `dms:class_created` / `dms:class_updated` / `dms:class_archived`      | `{ classId }`                                          | Class mutations               |
| `dms:contact_created` / `dms:contact_updated` / `dms:contact_removed` | `{ contactId, reason? }`                               | Contact mutations             |
| `dms:share_created` / `dms:share_revoked`                             | `{ shareId, documentId, granteeType, granteeId }`      | Share create/revoke           |
| `dms:view_created` / `dms:view_updated` / `dms:view_deleted`          | `{ viewId }`                                           | View mutations                |

### Phase Sequencing

**Phase 1 — Core Documents & Triage**: single + bulk upload, storage integration (version-scoped keys), tags, metadata jsonb, compression option (org default + override), Triage list, soft delete.

**Phase 2 — Classes**: class + field CRUD (admin ACL), required-field validation on classify, file-naming schema (metadata rename), archive.

**Phase 3 — Versions**: `newVersion`, version history, revert, prune beyond `maxVersions`, version-scoped download.

**Phase 4 — Views & Search**: condition model → drizzle filter engine, personal views with pin/default, `search` condition, full-text + quick search service, promote-to-view, admin shared views, sidebar pin table.

**Phase 5 — Contacts & Sharing**: contact CRUD with mandatory fields, removal-cascade revocation, share to contact (token) + internal user, download enforcement.

**Phase 6 — Recycle Bin, Retention, Hold & Activity**: expiry scanner cron, bin list (deleted + expired provenance), restore, retention + auto-purge cron (skip holds), legal holds, admin-only permanent delete/empty, per-document activity feed via AuditUnit, audit + events.

### Estimated Effort (Relative)

| Area                                  | Complexity  | Notes                                                                 |
| ------------------------------------- | ----------- | --------------------------------------------------------------------- |
| Upload (single/bulk) + Storage bridge | Low-Medium  | Thin StorageUnit wrapper, version-scoped keys, batch handling.        |
| Compression step                      | Medium      | Mode resolution, safe-fail, async for large files; per-version.       |
| Classes + required-field validation   | Medium      | Schema constraints, naming-schema metadata rename.                    |
| Versions + prune                      | Low-Medium  | Counter, history table, revert, `maxVersions` prune with hold skip.   |
| Views + condition engine → SQL        | Medium-High | Mirrors tasks `filter-engine`; class-field joins add complexity.      |
| Full-text + quick search              | Medium      | tsvector maintenance, GIN index, visibility scoping, promote-to-view. |
| Contacts + cascade                    | Low-Medium  | Mandatory-field + reason gating, revoke cascade.                      |
| Sharing (contact/user)                | Medium      | Token resolution, expiry, permission checks.                          |
| Recycle Bin + retention + holds       | Medium      | Retention resolution, auto-purge cron, hold enforcement at purge.     |
| Activity feed (AuditUnit)             | Low-Medium  | Inline `audit.write` per workflow; projection query with ordering.    |
| RBAC + ACL                            | Low         | `defineAcl` per resource; admin-only enforcement points.              |

### Testing Focus Areas

- **Triage gate**: upload → classify without required fields throws; classify with all required fields activates; bulk uploads produce one document per input.
- **Versions**: newVersion bumps counter + keeps history; revert copies target bytes; prune ≥ `maxVersions`; current version undeletable; holds block prune.
- **Compression**: default vs override resolution; failure keeps original bytes and flags the version.
- **Naming schema**: placeholder resolution, path/separator scrubbing, metadata-only rename (no S3 move), failure fallback.
- **View conditions & search**: eq/contains/between/date/search operators over document + class fields; triaged/deleted normalization; visibility scoping; shared-view ACL; promote search → view.
- **Retention & hold**: auto-purge respects per-class vs default retention; held document skipped by purge and rejected by `deletePermanently`; release restores purgeability.
- **Contact removal**: `removeContact` requires reason; every share cascades away; share token invalidated immediately.
- **Expiry lifecycle**: cron promotes expired docs; restore with renewed expiry; no silent re-activation.
- **Activity feed**: every workflow writes an AuditUnit entry; `getActivity` ordering by `seq`, paged, scoped.
- **Purge authority**: non-admin `deletePermanently` rejected; purge frees every version object and cascades tags/shares/pins.
