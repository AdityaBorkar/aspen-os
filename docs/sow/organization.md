# Organization Module — Scope of Work

> Scope of Work for an organization management module built on the `@aspen-os/framework`.

## Overview

The Organization Module manages the foundational identity and structure of a company within the platform: branding configuration (name, logo, accent color), physical and logical branch locations, inter-organization connections (partners, vendors, clients, subsidiaries), and compliance document tracking with expiry management. It serves as the organizational backbone that other modules reference for company-wide settings, location data, and regulatory posture.

The module integrates with the Auth unit for ownership and RBAC, the Storage unit for logo and document file management, and the PubSub unit for compliance expiry notifications and organizational change events.

---

## 1. Organization Profile

### 1.1 Organization

Core identity record for the company. Exactly one active organization per tenant.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Legal or display name of the organization. |
| **Slug** | text (unique) | URL-friendly identifier (auto-generated from name, editable). |
| **Logo** | text (FK, nullable) | Reference to Storage unit for the logo file. |
| **Accent Color** | text | Hex color code (e.g., `#3B82F6`) used for theming across the platform. |
| **Website** | text (nullable) | Organization website URL. |
| **Industry** | text (nullable) | Industry or sector. |
| **Phone** | text (nullable) | Primary contact phone. |
| **Email** | text (nullable) | Primary contact email. |
| **Address** | text (nullable) | Registered or headquarters address. |
| **Tax ID** | text (nullable) | Tax identification number (e.g., EIN, GSTIN, VAT). |
| **Registration Number** | text (nullable) | Company registration or incorporation number. |
| **Founded Date** | date (nullable) | Date of incorporation or founding. |
| **Timezone** | text | Default timezone for the organization (IANA format, e.g., `America/New_York`). |
| **Locale** | text | Default locale for formatting (e.g., `en-US`). |
| **Status** | enum | `active`, `suspended`, `archived`. |
| **Metadata** | jsonb (nullable) | Arbitrary key-value pairs for extensibility. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `get()` — retrieve the current organization profile.
- `update(patch)` — update organization details (name, branding, contact info, etc.).
- `updateBranding({ name?, logo?, accentColor? })` — scoped update for branding fields.
- `uploadLogo(file)` — upload logo file via Storage unit, update logo reference.
- `deleteLogo()` — remove logo, revert to default.

**Branding constraints**:
- `accentColor` must be a valid 6-digit hex color (e.g., `#3B82F6`).
- `name` is required, 1–255 characters.
- `slug` must be URL-safe (alphanumeric + hyphens), unique, 3–63 characters.
- Logo upload accepts PNG, JPG, SVG, or WebP; max 5 MB. Stored via Storage unit.

---

## 2. Branch Management

### 2.1 Branch

A physical office location, warehouse, store, or site belonging to the organization.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Branch name (e.g., "Headquarters", "Mumbai Office", "Warehouse #3"). |
| **Code** | text (unique) | Short code for reference (e.g., `HQ`, `MUM-01`, `WH-3`). |
| **Type** | enum | `headquarters`, `office`, `warehouse`, `store`, `factory`, `remote`, `other`. |
| **Address Line 1** | text | Street address. |
| **Address Line 2** | text (nullable) | Suite, floor, building. |
| **City** | text | City. |
| **State / Province** | text (nullable) | State or province. |
| **Postal Code** | text (nullable) | ZIP or postal code. |
| **Country** | text | Country (ISO 3166-1 alpha-2). |
| **Phone** | text (nullable) | Branch contact phone. |
| **Email** | text (nullable) | Branch contact email. |
| **Timezone** | text (nullable) | Branch-specific timezone (overrides org default). |
| **Capacity** | integer (nullable) | Maximum headcount or seating capacity. |
| **Is Active** | boolean | Whether the branch is currently operational. |
| **Opened Date** | date (nullable) | When the branch opened. |
| **Closed Date** | date (nullable) | When the branch was closed (if applicable). |
| **Parent Branch** | text (FK, nullable) | Reference to a parent branch for hierarchical structure (e.g., regional office under HQ). |
| **Manager** | text (FK, nullable) | Reference to the employee or user managing this branch. |
| **Notes** | text (nullable) | Internal notes. |
| **Metadata** | jsonb (nullable) | Arbitrary key-value pairs for extensibility. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new branch.
- `update(id, patch)` — update branch details.
- `activate(id)` / `deactivate(id)` — toggle operational status.
- `close(id, date)` — permanently close a branch with effective date.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.
- `list(filters?)` — list branches with optional filters (type, active, country, parent).

**Constraints**:
- Exactly one branch may be designated as `headquarters` type at a time.
- `code` must be unique, uppercase alphanumeric with hyphens, 2–20 characters.
- `country` must be a valid ISO 3166-1 alpha-2 code.
- Closing a branch does not cascade-delete related records; downstream modules handle reassignment.

### 2.2 Branch Hierarchy

Branches support a parent-child relationship via `Parent Branch` for organizational structures like:

```
Headquarters
├── Regional Office — North
│   ├── Store — Delhi
│   └── Store — Chandigarh
├── Regional Office — South
│   ├── Store — Bangalore
│   └── Store — Chennai
└── Warehouse — Central
```

- Maximum depth: 5 levels.
- Circular references prevented by validation on create/update.
- Query: `getBranchTree()` returns nested hierarchy as a tree structure.

---

## 3. Connections

### 3.1 Connection

Represents a relationship between the organization and an external entity — a partner, vendor, client, subsidiary, parent company, or any other stakeholder.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Name of the connected entity. |
| **Type** | enum | `client`, `vendor`, `partner`, `subsidiary`, `parent_company`, `investor`, `regulator`, `insurer`, `bank`, `other`. |
| **Status** | enum | `active`, `inactive`, `prospect`, `former`. |
| **Industry** | text (nullable) | Industry or sector of the connected entity. |
| **Website** | text (nullable) | Connected entity's website. |
| **Contact Person** | text (nullable) | Primary contact name. |
| **Contact Email** | text (nullable) | Primary contact email. |
| **Contact Phone** | text (nullable) | Primary contact phone. |
| **Address** | text (nullable) | Connected entity's address. |
| **Tax ID** | text (nullable) | Connected entity's tax identification number. |
| **Relationship Start Date** | date (nullable) | When the relationship began. |
| **Relationship End Date** | date (nullable) | When the relationship ended (if applicable). |
| **Annual Revenue** | numeric (nullable) | Connected entity's annual revenue (for clients/vendors). |
| **Contract Value** | numeric (nullable) | Total contract or engagement value. |
| **Notes** | text (markdown, nullable) | Internal notes about the connection. |
| **Tags** | text[] | Flexible tags for filtering and grouping (e.g., `strategic`, `local`, `tier-1`). |
| **Logo** | text (FK, nullable) | Reference to Storage unit for the connected entity's logo. |
| **Metadata** | jsonb (nullable) | Arbitrary key-value pairs for extensibility. |
| **Created By** | text (FK) | User who created the record. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new connection.
- `update(id, patch)` — update connection details.
- `updateStatus(id, status)` — change connection status.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.
- `list(filters?)` — list connections with optional filters (type, status, tags, search).
- `search(query)` — full-text search across name, contact person, tags.

### 3.2 Connection Contact

Multiple contact persons per connection.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Connection** | text (FK) | Reference to connection. |
| **Name** | text | Contact person's name. |
| **Title** | text (nullable) | Job title. |
| **Email** | text (nullable) | Email address. |
| **Phone** | text (nullable) | Phone number. |
| **Is Primary** | boolean | Whether this is the primary contact. |
| **Notes** | text (nullable) | Notes about this contact. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — add a contact to a connection.
- `update(id, patch)` — update contact details.
- `delete(id)` — remove a contact.
- `setPrimary(id)` — designate as primary contact (unsets others).

### 3.3 Connection Note

Activity log or communication history for a connection.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Connection** | text (FK) | Reference to connection. |
| **User** | text (FK) | User who added the note. |
| **Content** | text (markdown) | Note content. |
| **Type** | enum | `general`, `call`, `email`, `meeting`, `contract_renewal`, `issue`. |
| **Created At** | timestamptz | Record creation timestamp. |

- Append-only — no edits or deletes.
- Displayed as a timeline on the connection detail view.
- Filterable by type.

---

## 4. Compliance Management

### 4.1 Compliance Document

Tracks a regulatory, legal, or operational document required for the organization's compliance posture, along with its validity period and expiry.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Document name (e.g., "GST Registration Certificate", "Trade License", "ISO 9001 Certificate"). |
| **Category** | enum | `tax`, `license`, `certificate`, `permit`, `insurance`, `regulatory`, `legal`, `hr`, `safety`, `environmental`, `other`. |
| **Issuing Authority** | text (nullable) | Authority that issued the document (e.g., "Ministry of Corporate Affairs", "Local Municipality"). |
| **Document Number** | text (nullable) | Unique number on the document (license number, certificate ID, etc.). |
| **Issue Date** | date (nullable) | When the document was issued. |
| **Expiry Date** | date (nullable) | When the document expires. Null for documents with no expiry. |
| **Renewal Date** | date (nullable) | Planned renewal date (may differ from expiry). |
| **Status** | enum | `active`, `expiring_soon`, `expired`, `renewal_in_progress`, `archived`. |
| **Renewal Frequency** | enum (nullable) | `monthly`, `quarterly`, `semi_annual`, `annual`, `biennial`, `triennial`, `one_time`. |
| **Auto Renewal** | boolean | Whether this document is auto-renewed. |
| **Reminder Days** | integer[] | Days before expiry to send reminders (e.g., `[90, 60, 30, 7]`). |
| **Branch** | text (FK, nullable) | Reference to a specific branch if the document is branch-specific. Null for organization-wide. |
| **Connection** | text (FK, nullable) | Reference to a connection (e.g., insurer, regulator) associated with this document. |
| **Attachment** | text (FK, nullable) | Reference to Storage unit for the document file (PDF, image, etc.). |
| **Notes** | text (markdown, nullable) | Internal notes or renewal instructions. |
| **Last Notified At** | timestamptz (nullable) | When the last expiry reminder was sent. |
| **Renewed From** | text (FK, nullable) | Reference to the previous version of this document (renewal chain). |
| **Created By** | text (FK) | User who created the record. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — register a new compliance document.
- `update(id, patch)` — update document details.
- `uploadAttachment(id, file)` — upload or replace the document file via Storage unit.
- `markRenewalInProgress(id)` — set status to renewal_in_progress.
- `renew(id, newDocumentData)` — create a new document linked via `Renewed From`, archive the old one.
- `archive(id)` — archive a document that is no longer required.
- `list(filters?)` — list documents with optional filters (category, status, branch, expiring within N days).
- `getExpiring(days)` — retrieve all documents expiring within the specified number of days.
- `getExpired()` — retrieve all expired documents.

**Status derivation**:
- `active` — expiry date is null or more than `Reminder Days[0]` days away.
- `expiring_soon` — expiry date is within the first reminder threshold.
- `expired` — expiry date has passed.
- `renewal_in_progress` — manually set when renewal is underway.
- `archived` — manually archived.

### 4.2 Compliance Dashboard

Aggregated view of the organization's compliance posture.

- **Summary cards**: total documents, active, expiring soon, expired, renewal in progress.
- **Category breakdown**: document counts by category (tax, license, certificate, etc.).
- **Expiry timeline**: visual timeline showing upcoming expirations over the next 30/60/90/180 days.
- **Branch filter**: view compliance status per branch or organization-wide.
- **Overdue alerts**: prominently highlight expired documents and those past renewal date.

### 4.3 Compliance Reminder

Automated notification for upcoming document expirations.

- **Trigger**: scheduled job checks documents daily against `Reminder Days` thresholds.
- **Delivery**: via PubSub unit → notification channel (in-app, email — depends on notification unit).
- **Escalation**: if a document remains `expiring_soon` past its expiry date, status auto-transitions to `expired` and an escalated notification is sent.
- **Snooze**: ability to snooze a reminder for a specified number of days.

---

## 5. Data Model Summary

| Domain | Key Tables |
|---|---|
| **Profile** | Organization |
| **Branches** | Branch |
| **Connections** | Connection, Connection Contact, Connection Note |
| **Compliance** | Compliance Document, Compliance Reminder |

---

## 6. Dependencies & Prerequisites

| Dependency | Reason |
|---|---|
| **Auth Unit** | User identity for ownership (`Created By`), RBAC for organization admin roles. |
| **Storage Unit** | Logo uploads, compliance document attachments, connection logos. |
| **PubSub Unit** | Compliance expiry reminder scheduling and delivery, organizational change events. |
| **RPC Unit** | API exposure for client applications. |
| **HR Module** (optional) | Branch manager references to HR Employee master; branch assignment for employees. |
| **Notification Unit** (optional) | Multi-channel notification delivery (email, push) for compliance reminders. |

**Without HR Module**: The organization module operates independently. Branch `Manager` falls back to user lookup from the Auth unit. Employee-to-branch assignment is handled by downstream modules.

---

## 7. Cross-Module Integrations

### 7.1 HR Module Integration

| Integration | Flow |
|---|---|
| **Branch → Employee** | Employees can be assigned to branches (HR Employee master references Branch). |
| **Branch Manager → Employee** | Branch `Manager` field references HR Employee master. |
| **Department → Branch** | HR departments can be scoped to specific branches. |
| **Holiday List → Branch** | Branch-specific holiday lists leverage the branch entity. |

### 7.2 Auth Unit Integration

| Integration | Flow |
|---|---|
| **User → Organization Admin** | Organization settings are restricted to admin roles via Auth access control. |
| **User → Created By** | All records track the authenticated user who created them. |

### 7.3 Storage Unit Integration

| Integration | Flow |
|---|---|
| **Logo Upload → Organization** | Organization logo stored via Storage unit, referenced by FK. |
| **Document Attachment → Compliance** | Compliance document files stored via Storage unit. |
| **Logo → Connection** | Connected entity logos stored via Storage unit. |

### 7.4 PubSub Unit Integration

| Integration | Flow |
|---|---|
| **Compliance Reminder → PubSub** | Expiry reminders publish to PubSub for notification delivery. |
| **Organization Updated → PubSub** | Branding or profile changes publish events for UI refresh. |
| **Branch Created/Updated → PubSub** | Branch changes publish events for downstream consumers. |

---

## 8. RBAC Model

### Roles

| Role | Access |
|---|---|
| **Admin** | Full CRUD on all organization resources. Manage branding, branches, connections, compliance. |
| **Manager** | Read organization profile. CRUD on branches, connections, and compliance documents. Cannot change branding. |
| **Member** | Read-only access to organization profile, branches, and connections. Can view compliance status but not manage documents. |

### Resource Permissions

| Resource | Admin | Manager | Member |
|---|---|---|---|
| **organization** | Read + Update (including branding) | Read | Read |
| **branches** | CRUD + Archive | CRUD + Archive | Read |
| **connections** | CRUD + Archive | CRUD + Archive | Read |
| **connection_contacts** | CRUD | CRUD | Read |
| **connection_notes** | Create + Read | Create + Read | Read |
| **compliance_documents** | CRUD + Renew + Archive | CRUD + Renew + Archive | Read |
| **compliance_dashboard** | Read | Read | Read |

---

## 9. Out of Scope

- **Multi-organization / multi-tenant management**: this module manages a single organization per tenant. Tenant-level isolation is handled by the framework.
- **Document versioning / approval workflows**: compliance documents track renewal chains but do not have multi-step approval processes.
- **Regulatory rule engine**: no automated compliance checking against regulatory databases. Document tracking is manual.
- **Advanced analytics**: compliance trend analysis, risk scoring, benchmark comparisons (future module).
- **Integration with government portals**: no direct API integration with tax authorities, license registries, or regulatory bodies.
- **Organization chart visualization**: employee hierarchy visualization is handled by the HR module.
- **Multi-brand / sub-brand management**: single brand identity per organization.

---

## 10. Implementation Notes

### Module Structure

```
packages/organization/
├── index.ts                     # Module entry — implements Module interface
├── types.ts                     # Organization module types
├── db-schema.ts                 # Drizzle table definitions
├── workflows/
│   ├── organization.ts          # Organization profile CRUD & branding
│   ├── branch.ts                # Branch CRUD & hierarchy
│   ├── connection.ts            # Connection & contact CRUD
│   └── compliance.ts            # Compliance document lifecycle
├── services/
│   ├── branding-service.ts      # Logo upload, accent color validation
│   ├── branch-tree-service.ts   # Hierarchy queries, circular ref prevention
│   ├── compliance-service.ts    # Expiry status derivation, reminder scheduling
│   ├── notification-bridge.ts   # PubSub integration for compliance reminders
│   └── search-service.ts        # Full-text search across connections and documents
└── event-map.ts                 # Organization domain events
```

### Domain Events

| Event | Payload | Trigger |
|---|---|---|
| `organization:updated` | `{ organization, changes }` | Organization profile modified. |
| `organization:branding_updated` | `{ name?, logo?, accentColor? }` | Branding fields changed. |
| `branch:created` | `{ branch }` | Branch created. |
| `branch:updated` | `{ branch, changes }` | Branch details modified. |
| `branch:activated` | `{ branchId }` | Branch activated. |
| `branch:deactivated` | `{ branchId }` | Branch deactivated. |
| `branch:closed` | `{ branchId, date }` | Branch permanently closed. |
| `connection:created` | `{ connection }` | Connection created. |
| `connection:updated` | `{ connection, changes }` | Connection details modified. |
| `connection:status_changed` | `{ connectionId, fromStatus, toStatus }` | Connection status changed. |
| `connection:note_added` | `{ connectionId, note }` | Note appended to connection. |
| `compliance:document_created` | `{ document }` | Compliance document registered. |
| `compliance:document_expiring` | `{ document, daysUntilExpiry }` | Expiry reminder triggered. |
| `compliance:document_expired` | `{ document }` | Document status auto-transitioned to expired. |
| `compliance:document_renewed` | `{ oldDocument, newDocument }` | Document renewed (new version created). |
| `compliance:status_changed` | `{ documentId, fromStatus, toStatus }` | Document status changed. |

### Phase Sequencing

**Phase 1 — Core Profile & Branches**:
- Organization profile CRUD with branding management.
- Logo upload via Storage unit.
- Branch CRUD with hierarchy (parent-child).
- Branch tree query.
- RBAC enforcement for organization, branches.

**Phase 2 — Connections**:
- Connection CRUD with type and status management.
- Connection Contact CRUD (multi-contact per connection).
- Connection Note append-only log.
- Full-text search across connections.
- RBAC enforcement for connections.

**Phase 3 — Compliance**:
- Compliance Document CRUD with category and status.
- Document attachment upload via Storage unit.
- Expiry status derivation (active → expiring_soon → expired).
- Compliance reminder scheduling via PubSub.
- Compliance dashboard (summary cards, category breakdown, expiry timeline).
- Document renewal workflow (renewal chain).
- RBAC enforcement for compliance documents.

### Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Organization Profile CRUD | Low | Standard single-record CRUD with branding fields. |
| Logo Upload | Low | Storage unit integration, file type/size validation. |
| Accent Color Validation | Trivial | Hex color regex validation. |
| Branch CRUD | Low | Standard CRUD with optional parent reference. |
| Branch Hierarchy | Medium | Tree queries, circular reference prevention, depth limits. |
| Connection CRUD | Low | Standard CRUD with type/status enums. |
| Connection Contacts | Low | One-to-many CRUD with primary contact designation. |
| Connection Notes | Low | Append-only log with type filtering. |
| Compliance Document CRUD | Medium | Category, status derivation, renewal chain tracking. |
| Expiry Status Derivation | Medium | Scheduled job comparing dates against reminder thresholds. |
| Compliance Reminders | Medium | PubSub integration, configurable reminder days, escalation. |
| Compliance Dashboard | Medium | Aggregation queries across documents, timeline visualization. |
| RBAC Enforcement | Low | Leverages existing Auth unit access control. |

### Testing Focus Areas

- **Branding constraints**: hex color validation, logo file type/size limits, slug uniqueness and format.
- **Branch hierarchy**: circular reference prevention, depth limit enforcement, tree query correctness.
- **Branch headquarters constraint**: only one headquarters allowed at a time.
- **Compliance status derivation**: correct transitions from active → expiring_soon → expired based on dates and reminder thresholds.
- **Compliance reminders**: reminder firing at correct thresholds, no duplicate notifications, snooze behavior.
- **Document renewal chain**: old document archived, new document linked via `Renewed From`, chain is queryable.
- **RBAC**: permission enforcement per role across all resources; branding changes restricted to admin.
- **Connection search**: full-text search returns relevant results across name, contact person, tags.
