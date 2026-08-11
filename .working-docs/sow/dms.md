# DMS (Document Management System) Module — Scope of Work

> Scope of Work for a structured document management module built on the `@aspen-os/platform`.

## Overview

The DMS module provides records-oriented document management for organizations that must index every document before it becomes usable. Whereas the Drive module is a free-form filesystem (folders, paths, versions), DMS is **class-first**: every upload lands in a **Triage** stage and becomes an active **Document** only after it is assigned to a **Document Class** whose mandatory fields have been filled. All binary storage is delegated to the platform's StorageUnit; DMS owns the indexing semantics — classes, fields, tags, metadata, custom views, contacts, sharing, and the recycle bin.

The module is implemented **separately from `@aspen-os/drive`**. It shares the StorageUnit and AuthUnit but owns its own tables, lifecycle, and semantics (see §12).

### Key Architectural Decisions

1. **Compulsory indexing via a Triage gate.** No direct uploads into the active document store. Every upload (single or bulk) produces a triaged record capturing all input fields (class, tags, metadata, compression option). A document is not searchable, listable in normal views, or shareable until it is classified and all required class fields are satisfied.
2. **Document Classes provide the schema.** A class defines typed fields (with required flags), an optional file-naming schema, and is the only route to activate a triaged document. Classification is a first-class transition that validates required fields and applies the naming schema.
3. **Expiry is a document lifecycle state, not just a date.** Documents carry an optional `expiryDate`; when it passes, the document's status is promoted to `expired` and it surfaces in the Recycle Bin alongside deleted documents. Restoring an expired document reactivates it.
4. **Contacts are an org-wide address book, not user-owned.** Contacts are the sharing handles for external parties; internal users are also valid share grantees. Removing a contact is mandatory-reason-gated and revokes every share granted to that contact.
5. **Admin-only destructive authority.** Document Classes are created by admins; shared Views are published by admins; and only administrators may permanently delete documents from the Recycle Bin. Ordinary users may soft-delete their own documents and restore them.

---

## 1. Document Upload & Triage

### 1.1 Document

The central record. Every uploaded file becomes one Document.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Document Number** | text (auto) | Human-readable sequential number (e.g., `DOC-000123`). |
| **Name** | text | Current file name, including extension. May be renamed when a file-naming schema is applied on classification. |
| **Storage Key** | text | S3 object key in the StorageUnit. |
| **Content Type** | text | MIME type (e.g., `application/pdf`). |
| **Size** | bigint | File size in bytes. |
| **ETag** | text (nullable) | S3 ETag for integrity verification. |
| **Class** | text (FK, nullable) | Assigned Document Class. `null` while in Triage. |
| **Status** | enum | `triaged`, `active`, `expired`, `deleted`. See §1.4. |
| **Tags** | text[] | Tag names applied directly on the document (indexed counterpart of the `dms_document_tag` join). |
| **Metadata** | jsonb | Free-form key/value metadata captured at upload or patched later. |
| **Field Values** | jsonb | Values for the assigned class's fields (validated against the class schema). |
| **Compression** | jsonb (nullable) | Per-document compression/optimization override. `null` = use org default. See §1.3. |
| **Batch ID** | text (nullable) | Groups files uploaded in a single bulk-upload request. |
| **Owner** | text (FK) | User who uploaded the document. |
| **Uploaded By** | text (FK) | User who performed the upload (may differ from owner in delegated flows). |
| **Expiry Date** | date (nullable) | Optional expiry. When passed, status promotes to `expired` (see §5.1). |
| **Expired At** | timestamptz (nullable) | When the document became expired. |
| **Deleted At** | timestamptz (nullable) | When the document was moved to the Recycle Bin. |
| **Deleted By** | text (FK, nullable) | Who soft-deleted the document. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `upload(input)` — single upload. Accepts bytes (or a presigned upload once StorageUnit returns a URL), filename, content type, and optional tags, metadata, and compression override.
- `uploadBulk(inputs)` — bulk upload. Accepts an array of single-upload inputs; each becomes its own triaged Document sharing a `batchId`.
- `get(id)` — fetch document record (no download).
- `download(id)` / `getDownloadUrl(id, expiry?)` — presigned GET URL via StorageUnit.
- `update(id, patch)` — rename, patch metadata/tags/compression on a triaged document, or patch non-schema metadata on an active one.
- `tag(id, tagName)` / `untag(id, tagName)` — apply/remove tags.
- `addMetadata(id, key, value)` / `removeMetadata(id, key)` — patch the metadata bag.
- `delete(id)` — soft-delete (moves to Recycle Bin; see §5).

**Constraints**:
- No upload is inserted directly into the active document set. The initial (and only automatic) status is `triaged`.
- Uploaded bytes are written once to S3. Classification that applies a file-naming schema renames the object via `storageUnit.move()` — no re-upload.
- Max file size, allowed content types, and default compression are configurable per module config (defaults: 5 GB, all types, org default below).
- Triaged documents are visible in the Triage list (§1.2) and to admins only from normal search/views (§3 normalizes them out).

### 1.2 Triage

A first-class workspace stage, not a folder. It lists every Document whose status is `triaged`.

- `listTriage(filters?)` — list triaged documents with the input fields already captured (tags, metadata, compression).
- `getTriageDetail(id)` — full triaged record including missing required-field report for candidate classes.
- `classify(id, classId, fieldValues)` — commit the document to a class. Validates that every required field of the class is present and valid (see §2); on success, sets status `active`, applies the class's file-naming schema (if defined), stores `fieldValues`, and publishes `dms:document_classified`.
- `delete(id)` — soft-delete from Triage (owner or admin).
- Triage can be pinned to the sidebar by any user (see §6).

**Flow**: Upload → (fill/patch tags, metadata, compression) → classify → active. A triaged document carries no class until classified; classification is the only transition out of Triage.

### 1.3 Compression Options

Compression is interpreted as "file compression/optimization" applied when the document is written to storage.

- **Org-level default** — stored in the module settings table (`dms_setting`, key `defaultCompression`) and used for every upload that does not specify an override. Managed by admins (see §8).
- **Per-upload override** — an optional `compression` object on each upload input and each Document record.

```ts
type CompressionOption = {
  mode: "none" | "archive" | "image" | "pdf"; // archive = ZIP, image = re-encode, pdf = optimize
  quality?: number;                          // e.g., 0-100 for image/pdf
  format?: string;                           // e.g., "zip", "jpeg", "webp", "pdf/a"
  enabled: boolean;                          // soft switch; false = store as-is
};
```

- Compression runs as a post-upload step (inline service call or async job for large files) and never fails the upload — the original bytes are kept on failure and the document is flagged `compression: { enabled: false, reason }`.
- The module never re-uploads; compression produces the stored object key content.

---

## 2. Document Classes

### 2.1 Document Class

A template that defines the schema a Document must satisfy before it becomes active in that class.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | e.g., `Invoice`, `Certificate`, `Board Resolution`. |
| **Description** | text (nullable) | Purpose / guidance shown when classifying. |
| **Color** | text (nullable) | Hex color for UI display. |
| **Icon** | text (nullable) | Icon identifier for UI display. |
| **File Naming Schema** | text (nullable) | Optional filename template; see §2.3. |
| **Is Active** | boolean | `false` archives the class (existing documents unaffected). Default `true`. |
| **Created By** | text (FK) | Admin who created the class. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

Management is admin-only (`dms:admin`).

### 2.2 Class Field

A typed column of a Document Class.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Class** | text (FK) | Owning Document Class. |
| **Name** | text | Unique field key within the class (e.g., `invoiceNumber`). |
| **Label** | text | Display label (e.g., `Invoice Number`). |
| **Type** | enum | `text`, `number`, `date`, `select`, `multi-select`, `boolean`, `user`, `contact`, `url`, `email`, `phone`. |
| **Is Required** | boolean | Must be filled before a Document can be classified into the class. Default `false`. |
| **Default Value** | jsonb (nullable) | Auto-filled value when not provided. |
| **Options** | jsonb (nullable) | For `select` / `multi-select`: the list of allowed values. |
| **Sort Order** | integer | Display/validation order. |
| **Is Active** | boolean | Inactive fields are hidden from the classify form but their stored values are preserved. |

### 2.3 File Naming Schema

Optional per-class filename template evaluated with the document's field values at classification time.

- Placeholders: `{field:<name>}`, `{class}`, `{docNumber}`, `{date}`, `{date:yyyy}`, `{date:MM}`, `{seq}` (a zero-padded per-class sequence).
- Example: `{class}_{docNumber}_{field:einvoiceno}-{date:yyyy}.pdf`.
- Applied by renaming the stored object (`storageUnit.move`) and updating the Document `name`. Unresolved placeholders resolve to a safe fallback (`_`); the result strips path separators and null bytes.
- Once applied, classification commits the final name.

### 2.4 Operations & Constraints

- `createClass(input)` / `updateClass(id, patch)` / `archiveClass(id)` — admin-only. Delete is disallowed while the class has active or expired documents; use `archive`.
- `getClass(id)` / `listClasses(filters?)` — readable by all users (needed to fill the classify form).
- `addField(classId, field)` / `updateField(id, patch)` / `deactivateField(id)`.
- Adding a new **required** field does not back-fill existing active documents; it applies to newly classified documents.
- Changing a field's type is blocked if field values already exist in that column; deactivate-then-recreate instead.
- A class cannot be archived if it is currently referenced by a triaged document.

---

## 3. Document Views

Saved, reusable **filter + sort** configurations over active (and optionally expired) documents. Models a superset of the tasks `savedView` pattern, extended with class-field conditions.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | e.g., `Invoices due this month`. |
| **Owner** | text (FK) | User who created the view. |
| **Filters** | jsonb | Array of conditions; see below. |
| **Sort** | jsonb | Array of `{ field, direction }`. |
| **Is Default** | boolean | Auto-applied view for the owner. Default `false`. |
| **Is Shared** | boolean | Admin-published view visible to all users. Default `false`. |
| **Is Pinned** | boolean | Pinned to the owner's sidebar. Default `false`. |
| **Created At** / **Updated At** | timestamptz | Record timestamps. |

**Condition model** (over document columns and class fields):

- Document-level fields: `class`, `status`, `tag`, `owner`, `uploadedBy`, `size`, `contentType`, `createdAt`, `updatedAt`, `expiryDate`, metadata keys.
- Class fields: `classField:<name>` — any field of the target class (e.g., `classField:invoiceNumber`).
- Operators: `eq`, `neq`, `contains`, `notContains`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `between`, `isEmpty`, `isNotEmpty`, `dateBefore`, `dateAfter`.

**Operations**:
- `createView(input)` — any user; `isShared` allowed only for admins.
- `updateView(id, patch)` — owner, or admins for shared views.
- `deleteView(id)` — owner, or admins for shared views.
- `pinView(id, pinned)` / `setDefaultView(id)`.
- `applyView(input)` — resolves a view (by ID or ad-hoc filter/sort) into a document listing, normalizing out triaged/deleted documents unless explicitly filtered.

**Constraints**:
- Views never expose triaged or deleted documents unless the view explicitly targets `status = triaged|deleted` (deleted only to admins).
- Deleting a class or deactivating a field quietly drops the corresponding view conditions.

---

## 4. Contacts

### 4.1 Contact

An org-wide address-book entry used to share files with external parties (and linked to internal users where applicable).

| Field | Type | Mandatory | Description |
|---|---|---|---|
| **ID** | text (auto) | auto | System-generated unique identifier. |
| **First Name** | text | ✅ | Contact's first name. |
| **Last Name** | text | ✅ | Contact's surname. |
| **Email** | text | ✅ | Email (shared org-uniqueness). |
| **Phone** | text | ✅ | Phone number. |
| **Company Name** | text | ✅ | Organization they belong to. |
| **Designation** | text | ✅ | Role/title at that company. |
| **Deletion Reason** | text | required on delete | Why the contact is being removed; optional on create/update. |
| **Linked User** | text (FK, nullable) | — | Optional link to an internal `AuthUnit` user when the contact represents a platform account. |
| **Created By** | text (FK) | auto | User who added the contact. |
| **Is Removed** | boolean | auto | `true` after deletion (soft). |
| **Removed At** | timestamptz (nullable) | — | When the contact was removed. |

**Operations**:
- `createContact(input)` — all 6 business fields mandatory.
- `updateContact(id, patch)` — any field except `deletionReason`.
- `removeContact(id, reason)` — `deletionReason` is **mandatory**; marks `isRemoved = true` and revokes every share granted to this contact (see §4.3). The contact hides from listings via the `dms:contact:delete` action audit.
- `getContact(id)` / `listContacts(filters?)` — org-wide.

### 4.2 Sharing to Contacts & Users

Sharing grants a grantee access to a Document.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Document** | text (FK) | Shared document. |
| **Grantee Type** | enum | `contact` (external, no login) or `user` (internal AuthUnit user). |
| **Grantee ID** | text (FK) | Contact ID or User ID. |
| **Permission** | enum | `viewer` (view/download) or `editor` (also add/remove tags and metadata; no delete). |
| **Share Token** | text (nullable) | Access token for `contact` grantees (see below). |
| **Shared By** | text (FK) | User who created the share. |
| **Expires At** | timestamptz (nullable) | Optional expiry. |
| **Created At** | timestamptz | Share creation timestamp. |

- `createShare(input)` — share a document with a contact or internal user.
- `updateShare(id, patch)` — change permission/expiry.
- `removeShare(id)` — revoke access.
- `listShares(documentId)` / `listSharedWithGrantee(granteeType, granteeId)` — enumerate grants.

**Contact grant semantics** (no login required): sharing to a contact creates a `Share` with a `shareToken` (16 bytes, base64url). The contact (or anyone holding the token and, optionally, the document's access rules) can download via a token-resolved download endpoint. Revoking the share or removing the contact invalidates the token immediately.

**Internal-user grant semantics**: sharing to a `user` grants access within normal authenticated visibility (document appears in the user's listings and downloads).

### 4.3 Contact Removal Cascade

`removeContact(id, reason)`:
1. Validates `reason` is non-empty.
2. Marks `isRemoved = true` with `removedAt`.
3. Deletes every `dms_share` referencing the contact (hard revoke — access stops immediately).
4. Publishes `dms:contact_removed` and audit entry with `reason`.

---

## 5. Recycle Bin

A bin view over documents whose status is `deleted` **or** `expired`. This is read-mostly; the only state changes here are restore (any user with authority over the record) and permanent delete (**admin only**).

### 5.1 Document Lifecycle

```
upload ──▶ triaged ──classify──▶ active ──▶ expired     (expiryDate passed)
                │                  │
                └──── delete ──────┘──── deleted ──restore──▶ active
                                          │
                                   purge (admin) ──▶ gone
```

- `deleted`: set by `DocumentWorkflow.delete()` (owner or admin). Record is kept, status `deleted`, excluded from normal listings/search.
- `expired`: derived state. Set actively (not via trigger) by the expiry scanner — a scheduled pg-boss cron (daily, configurable) that promotes documents past their `expiryDate` to `expired` and publishes `dms:document_expired`. A document already `expired` never silently becomes active; activation happens via explicit restore.

### 5.2 Operations

- `list(recycleBin filters)` — both `deleted` and `expired` documents, with deleted vs expired provenance, retained class/fields, and deletion/expiry timestamps. Non-admins see only records they can restore.
- `restore(id)` — `deleted` → `active` (retained class, fields, tags); `expired` → `active` (document returns to the active set; optionally with a renewed `expiryDate` supplied at restore). Publishes `dms:document_restored`.
- `deletePermanently(id)` — **admin only**. Removes the object from storage (`storageUnit.remove`), then deletes the row; cascades tags, shares, pins, and field values. Publishes `dms:document_purged`.
- `emptyBin(filters?)` — admin only. Bulk `deletePermanently` over matching bin items.
- No automatic purge in the base scope; automatic retention (`trashRetentionDays` config) is a noted follow-up (see §11).

---

## 6. Pinning to Sidebar

Both Triage and Document Views (and optionally classes) can be pinned to a user's sidebar. Pinning is per-user, orthogonal to ownership.

| Field | Type | Description |
|---|---|---|
| **User** | text (FK) | User whose sidebar contains the pin. |
| **Item Type** | enum | `triage`, `view`, `class`. |
| **Item ID** | text (FK) | Referenced item. |
| **Sort Order** | integer | Render order in the sidebar. |
| **Created At** | timestamptz | Pin creation timestamp. |

- `pinItem(userId, itemType, itemId)` / `unpinItem(...)` / `listPinned(userId)`.
- Deleting a view, archiving a class, or deleting a document removes stale pins.

---

## 7. Storage & Download Flows

All binary operations delegate to StorageUnit (S3-compatible); the module never writes to S3 directly.

### 7.1 Upload

1. Client calls `upload*` with bytes/stream, filename, content type, tags, metadata, compression override.
2. DMS resolves the compression option (override, else org default) and computes the storage key `dms/{tenantId}/{fileId}/{name}`.
3. DMS delegates upload to `storageUnit.upload(...)`; on success inserts a `triaged` Document with the returned etag/size.
4. Compression/optimization step runs per §1.3; original bytes remain on failure.
5. Publishes `dms:document_uploaded` (with `batchId` for bulk).

### 7.2 Download

1. Resolve document → storage key; enforce permission (owner, viewer/editor share, or share token).
2. `storageUnit.getSignedGetUrl(storageKey, { expiresIn })` → presigned URL (default 1 h, max 7 d).
3. Token-granted downloads (`contact` shares) are resolved via the `dms:share:resolve` workflow, which checks the share record, expiry, and active document status, then issues the same presigned URL.

### 7.3 Classification Rename

Applying a file-naming schema calls `storageUnit.move(oldKey, newKey)`; instances where the object is mid-consumption are exempted (safe fallback keeps the old key).

---

## 8. Module Settings

Org-level defaults, stored as key/value JSON in a `dms_setting` table; admin-managed.

| Key | Example Value | Used By |
|---|---|---|
| `defaultCompression` | `{ mode: "none", enabled: true }` | §1.3 uploads without an override |
| `presignedUrlDefaultExpiry` | `3600` | download URL default (seconds) |
| `presignedUrlMaxExpiry` | `604800` | max download URL expiry |

- `getSetting(key)` / `setSetting(key, value)` — read any user (for client prefill), write admin-only.

---

## 9. Data Model Summary

| Domain | Key Tables |
|---|---|
| **Documents & Triage** | `dms_document` |
| **Classes** | `dms_document_class`, `dms_class_field` |
| **Tags** | `dms_tag`, `dms_document_tag` |
| **Views** | `dms_view` |
| **Contacts** | `dms_contact` |
| **Sharing** | `dms_share` |
| **Sidebar Pins** | `dms_pin` |
| **Settings** | `dms_setting` |

All IDs are `text` with `DEFAULT uuidv7()`. All timestamps are `TIMESTAMPTZ` (`withTimezone: true`). All tables live in tenant schemas (no control-plane tables).

---

## 10. Dependencies & Prerequisites

| Dependency | Reason |
|---|---|
| **Storage Unit** | All binary operations: upload, presigned URLs, move on naming-schema rename, delete on purge. |
| **Auth Unit** | User identity, ownership, internal-user share grantees, RBAC (`applyModuleAcl`). |
| **PubSub Unit** | Document/class/contact/share events; scheduled expiry scanner cron. |
| **DB Unit** | Drizzle ORM for all metadata tables. |
| **RPC Unit** | API exposure for client applications. |

**No module dependencies.** Deliberately independent of `@aspen-os/drive` (see §12). Optional future integration points: `@aspen-os/organization` sharing contacts-by-link, `@aspen-os/compliance` for expiry-driven verification.

---

## 11. RBAC Model

### Roles (`dms:admin`, `dms:operator`, `dms:viewer`)

| Role | Description |
|---|---|
| **dms:admin** | Manage classes and class fields, shared views, module settings, all contacts/shares, and the Recycle Bin — including **permanent deletion** (the "administrator" in the feature list). |
| **dms:operator** | Data entry: upload, triage, classify, tag, metadata, create personal views, contacts, share own documents. |
| **dms:viewer** | Read/download documents and views; no upload, no share. |

### Resource Permissions

| Action | dms:admin | dms:operator | dms:viewer |
|---|---|---|---|
| Upload / bulk upload | ✅ | ✅ | ❌ |
| Read / download any document | ✅ | ✅ (own + shared) | ✅ (shared) |
| Classify / tag / metadata | ✅ | ✅ (own) | ❌ |
| Soft-delete document | ✅ | ✅ (own) | ❌ |
| Create / publish shared view | ✅ | ❌ (personal only) | ❌ (personal only) |
| Create / update class fields | ✅ | ❌ | ❌ |
| Manage all contacts/shares | ✅ | ✅ (own shares) | ❌ |
| **Permanently delete from bin** | ✅ | ❌ | ❌ |
| Restore from bin | ✅ (any) | ✅ (own) | ❌ |
| Manage module settings | ✅ | ❌ | ❌ |

---

## 12. Relationship to the Drive Module

- **Separate implementation.** DMS owns its own tables (`dms_*`), storage-key scheme, and lifecycle. It does not import or extend Drive entities/folders/paths.
- **Rationale.** Drive is a free-form explorer with folders, versions, labels, and public links. DMS is a records system: schema-enforced indexing (classes → required fields), a mandatory triage gate, contacts as sharing handles, and an expiry-driven recycle bin. Intertwining them would couple the explorer's loose semantics to the records system's invariants, and would drag DMS behind Drive's path-cascade/versioning machinery.
- **Shared platform, not shared tables.** Both use StorageUnit (distinct key prefixes), AuthUnit, PubSub, and the DB unit. If a future need emerges (e.g., Drive-style previews inside DMS, or DMS documents exposed in Drive), that is an explicit integration feature, not accidental coupling.

---

## 13. Out of Scope

- **Client UI** (sidebar pinning, upload/drag-and-drop screens, bin screens, class designer). This SOW scopes `@aspen-os/dms` (backend module only); the TanStack Start app is a separate workstream.
- **File preview / rendering**: in-browser preview of PDFs, images, documents. Client concern.
- **OCR / text extraction** for full-text search.
- **Resumable uploads (tus.io)** — todo/dms.md feature; deferred.
- **Adobe-style document features**: doc merge, doc split, export-as, share-link-with-password — deferred to a later SOW.
- **Document versioning / history** (drive-style version tables).
- **Auto-purge retention policy** (configurable `trashRetentionDays` + scheduled purge) — flagged as a low-effort follow-up, not in base scope.
- **Sub-domain–per-tenant login / admin-panel settings UI** — see todo/dms.md; the module exposes `dms_setting` but not the multi-subdomain routing concern.
- **Real-time collaboration** and **audit retention policy**.

---

## 14. Implementation Notes

### Module Structure

```
packages/dms/
├── index.ts                     # DmsModule entry — implements Module interface
├── types.ts                     # DMS module types (row types, config)
├── db-schema.ts                 # Drizzle table definitions (9 tables + enums)
├── event-map.ts                 # DMS domain events
├── schemas/
│   ├── index.ts                 # Barrel re-exports
│   ├── enums.ts                 # Valibot enum schemas (status, field type, grantee, permission, pin type)
│   ├── document.ts              # Upload/create/update/classify schemas
│   ├── class.ts                 # Class + field + naming-schema schemas
│   ├── view.ts                  # View + condition + sort schemas
│   ├── contact.ts               # Contact + removal-reason schemas
│   ├── share.ts                 # Share schemas
│   └── utils.ts                 # Shared validators
├── workflows/
│   ├── document.ts              # upload, uploadBulk, get, download, update, tag/untag, metadata, delete
│   ├── triage.ts                # listTriage, getTriageDetail, classify (validates class fields + naming)
│   ├── class.ts                 # class + field CRUD, archive
│   ├── view.ts                  # view CRUD, pin, apply
│   ├── contact.ts               # contact CRUD + removal cascade
│   ├── share.ts                 # share create/update/revoke, token resolution
│   ├── recycle-bin.ts           # list, restore, deletePermanently (admin), emptyBin
│   └── settings.ts              # get/set setting
└── services/
    ├── classify-service.ts      # required-field validation, naming-schema render + rename
    ├── compression-service.ts   # compression/optimization step (mode resolution, run, safe-fail)
    ├── condition-service.ts     # View condition → drizzle SQL (mirrors tasks filter-engine)
    └── expiry-scanner.ts        # scheduled cron: promote expired documents, publish events
```

### Domain Events

| Event | Payload (summary) | Trigger |
|---|---|---|
| `dms:document_uploaded` | `{ documentId, batchId?, size, contentType }` | Upload / bulk upload |
| `dms:document_classified` | `{ documentId, classId, docNumber }` | Triage classify |
| `dms:document_updated` | `{ documentId, changes }` | Metadata/tags/rename |
| `dms:document_expired` | `{ documentId, expiryDate }` | Expiry scanner |
| `dms:document_deleted` | `{ documentId, deletedBy }` | Soft delete |
| `dms:document_restored` | `{ documentId }` | Recycle Bin restore |
| `dms:document_purged` | `{ documentId, storageKey }` | Permanent delete (admin) |
| `dms:document_tagged` / `dms:document_untagged` | `{ documentId, tag }` | Tag apply/remove |
| `dms:class_created` / `dms:class_updated` / `dms:class_archived` | `{ classId }` | Class mutations |
| `dms:contact_created` / `dms:contact_updated` / `dms:contact_removed` | `{ contactId, reason? }` | Contact mutations |
| `dms:share_created` / `dms:share_revoked` | `{ shareId, documentId, granteeType, granteeId }` | Share create/revoke |
| `dms:view_created` / `dms:view_updated` / `dms:view_deleted` | `{ viewId }` | View mutations |

### Phase Sequencing

**Phase 1 — Core Documents & Triage**: single + bulk upload, storage integration, tags, metadata jsonb, compression option (org default + override), Triage list, soft delete.

**Phase 2 — Classes**: class + field CRUD (admin ACL), required-field validation on classify, file-naming schema + rename, archive.

**Phase 3 — Views & Pins**: condition model → drizzle filter engine, personal views with pin/default, admin shared views, sidebar pin table.

**Phase 4 — Contacts & Sharing**: contact CRUD with mandatory fields, removal-cascade revocation, share to contact (token) + internal user, download enforcement.

**Phase 5 — Recycle Bin & Expiry**: expiry scanner cron, bin list (deleted + expired provenance), restore (both), admin-only permanent delete/empty, audit + events.

### Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Upload (single/bulk) + Storage bridge | Low-Medium | Thin StorageUnit wrapper with batch handling. |
| Compression step | Medium | Mode resolution, safe-fail, async for large files. |
| Classes + required-field validation | Medium | Schema constraints, naming-schema render + move. |
| Views + condition engine → SQL | Medium-High | Mirrors tasks `filter-engine`; class-field joins add complexity. |
| Contacts + cascade | Low-Medium | Mandatory-field + reason gating, revoke cascade. |
| Sharing (contact/user) | Medium | Token resolution, expiry, permission checks. |
| Recycle Bin + expiry scanner | Low-Medium | Cron promotion, provenance joins, admin-only purge. |
| RBAC + ACL | Low | `defineAcl` per resource; admin-only enforcement points. |

### Testing Focus Areas

- **Triage gate**: upload → classify without required fields throws; classify with all required fields activates; bulk uploads produce one document per input.
- **Compression**: default vs override resolution; failure keeps original bytes and flags the document.
- **Naming schema**: placeholder resolution, path/separator scrubbing, object rename via `storageUnit.move`, failure fallback.
- **View conditions**: eq/contains/between/date operators over document + class fields; triaged/deleted normalization; shared-view ACL.
- **Contact removal**: `removeContact` requires reason; every share cascades away; share token invalidated immediately.
- **Expiry lifecycle**: cron promotes expired docs; restore with renewed expiry; no silent re-activation.
- **Purge authority**: non-admin `deletePermanently` rejected; purge frees storage key and cascades tags/shares/pins.