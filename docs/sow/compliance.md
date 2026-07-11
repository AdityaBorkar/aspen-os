# Compliance Module — Scope of Work

> Scope of Work for a centralized compliance management module built on the `@aspen-os/framework`.

## Overview

The Compliance Module is a cross-cutting governance module that serves as the **single source of truth** for all regulatory, legal, and operational compliance obligations across the platform. It centralizes compliance document storage, verification workflows, expiry tracking, and automated reminders — replacing the basic compliance document tracking currently embedded in the Organization module.

Unlike domain-specific modules (HR, Accounting, Fleet) that own their own data, the Compliance Module is a **hub**: other modules submit compliance documents, requirements, and obligations to it, and the Compliance Module handles the lifecycle — verification, expiry monitoring, escalation, and audit trail. This design ensures that a compliance officer has one unified view of the organization's entire compliance posture, regardless of which domain module originated the requirement.

**Relationship to the existing Organization module compliance workflow**: The Organization module's `ComplianceWorkflow` (tracking certificates, licenses, permits for the organization itself) becomes one of many entry points. The Compliance Module subsumes that workflow's data model and extends it with verification, multi-module intake, recurring obligation scheduling, and a pg-boss-powered reminder engine. The Organization module will delegate to the Compliance module rather than maintaining its own compliance tables.

### Key Architectural Decisions

1. **pg-boss `schedule()` for recurring jobs**: The reminder engine uses pg-boss cron scheduling (`boss.schedule(name, cron, data, options)`) for daily expiry scans, status transitions, obligation generation, and weekly summaries. This requires exposing `schedule()`, `unschedule()`, and `getSchedules()` on the framework's `PubSubUnit`, which currently only wraps `publish`/`subscribe`/`send`/`work`.

2. **Event-driven intake**: Other modules create compliance documents either by calling the Compliance module's workflow API directly (`framework.compliance.documents.create(...)`) or by publishing domain events that the Compliance module subscribes to (e.g., `hr:employee_onboarded` → compliance module creates a "background check verification" requirement).

3. **Verification as a first-class workflow**: Documents are not just stored — they go through a verification lifecycle (`draft` → `submitted` → `under_review` → `verified` / `rejected` → `expired` / `renewed`), with assignable reviewers and audit trail entries at every transition.

4. **Generic recurring obligations, not domain-specific sub-entities**: Taxation filings, certificate renewals, periodic safety audits, annual permit applications — these are all instances of the same pattern: a recurring obligation that produces compliance documents on a schedule. Rather than modeling tax filings, certificate renewals, and audit cycles as separate entities with bespoke tables, the module provides a single **Compliance Obligation** entity — a configurable recurring schedule that auto-generates compliance documents. Domain-specific data (tax type, jurisdiction, filing amounts, audit scope, vehicle registration number, etc.) lives in the document's `metadata` jsonb field. This makes the module adaptable to any future compliance workflow without schema changes.

---

## 1. Compliance Document Registry

The central store for all compliance documents. Any module can register a document here. Each document carries its origin (which module created it), its verification status, its expiry or due-date lifecycle, and optional domain-specific metadata.

A single document model serves all compliance use cases:

| Use Case | `Expiry Date` | `Due Date` | `Period Start/End` | `metadata` example |
|---|---|---|---|---|
| ISO 9001 Certificate | 2026-12-31 | — | — | `{ "certifyingBody": "TUV", "score": "A+" }` |
| GST Return filing | — | 2025-05-20 | 2025-04-01 → 2025-04-30 | `{ "taxType": "gst", "jurisdiction": "IN-GST", "returnForm": "GSTR-1", "taxAmount": 125000, "amountPaid": 125000 }` |
| Vehicle pollution certificate | 2026-06-15 | — | — | `{ "vehicleReg": "MH-12-AB-1234", "emissionNorms": "BS6" }` |
| Quarterly safety audit | — | 2025-09-30 | 2025-07-01 → 2025-09-30 | `{ "auditScope": "Fire Safety", "auditor": "External" }` |
| Employee background check | 2026-07-10 | — | — | `{ "employeeId": "emp-123", "checkType": "criminal" }` |

### 1.1 Compliance Document

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Document name (e.g., "GST Return April 2025", "ISO 9001 Certificate", "Vehicle Pollution Certificate — MH-12-AB-1234"). |
| **Reference Number** | text (nullable) | Document number, license number, certificate ID, filing acknowledgment, or reference. |
| **Category** | enum | `tax`, `license`, `certificate`, `permit`, `insurance`, `regulatory`, `legal`, `hr`, `safety`, `environmental`, `data_privacy`, `financial`, `vehicle`, `property`, `audit`, `other`. |
| **Document Type** | text (nullable) | Free-text sub-type within a category (e.g., category=`tax`, type="GST Return"; category=`certificate`, type="ISO 9001"; category=`audit`, type="Fire Safety"). |
| **Issuing Authority** | text (nullable) | Authority that issued the document (e.g., "Ministry of Corporate Affairs", "RTO Mumbai", "ISO Certifying Body"). |
| **Jurisdiction** | text (nullable) | Geographic or regulatory jurisdiction (e.g., "IN-MH", "US-CA", "EU-GDPR", "global"). ISO 3166-2 or custom. |
| **Issue Date** | date (nullable) | When the document was issued, filed, or completed. |
| **Expiry Date** | date (nullable) | When the document expires. Used for certificates, licenses, permits. Null for documents with no expiry. |
| **Due Date** | date (nullable) | Deadline by which the document must be filed, submitted, or completed. Used for filings, audits, periodic reports. Null for expiry-based documents. |
| **Effective Date** | date (nullable) | When the document becomes effective (may differ from issue date). |
| **Period Start** | date (nullable) | Start of the compliance period this document covers (e.g., tax period start, audit period start). |
| **Period End** | date (nullable) | End of the compliance period. |
| **Renewal Date** | date (nullable) | Planned renewal date (may differ from expiry). |
| **Renewal Frequency** | enum (nullable) | `one_time`, `monthly`, `quarterly`, `semi_annual`, `annual`, `biennial`, `triennial`. |
| **Auto Renewal** | boolean | Whether the document auto-renews. Default `false`. |
| **Verification Status** | enum | `draft`, `submitted`, `under_review`, `verified`, `rejected`, `expired`, `overdue`, `renewed`, `archived`. |
| **Reminder Days** | integer[] | Days before expiry/due date to trigger reminders (e.g., `[90, 60, 30, 7]`). Defaults to `[90, 60, 30, 7]`. |
| **Escalation Days** | integer[] (nullable) | Additional escalation thresholds after expiry/overdue (e.g., `[1, 7, 30]` — escalate 1 day, 7 days, 30 days post-expiry). |
| **Source Module** | text | The module that created this document (e.g., `organization`, `hr`, `fleet`, `accounting`). For audit and filtering. |
| **Source Entity Type** | text (nullable) | The type of the source entity (e.g., `organization`, `employee`, `vehicle`, `property`). |
| **Source Entity ID** | text (nullable) | FK to the source entity. |
| **Branch** | text (FK, nullable) | Reference to Organization module's Branch if the document is branch-specific. |
| **Connection** | text (FK, nullable) | Reference to Organization module's Connection (e.g., insurer, regulator). |
| **Obligation ID** | text (FK, nullable) | Reference to the Compliance Obligation that auto-generated this document, if applicable. |
| **Assigned Reviewer** | text (FK, nullable) | User assigned to verify this document. |
| **Assigned To** | text (FK, nullable) | User responsible for completing/filing this document (for due-date-based documents). |
| **Reviewed At** | timestamptz (nullable) | When the document was last verified. |
| **Reviewed By** | text (FK, nullable) | User who verified the document. |
| **Rejection Reason** | text (nullable) | Reason if verification was rejected. |
| **Completed At** | timestamptz (nullable) | When a due-date-based document was completed/filed. |
| **Attachment** | text (FK, nullable) | Reference to Storage unit for the document file (PDF, image, etc.). |
| **Reminder Channel** | enum (nullable) | Preferred reminder channel: `pubsub`, `email`, `both`. Default `pubsub`. |
| **Notes** | text (nullable) | Internal notes or renewal instructions. |
| **Last Notified At** | timestamptz (nullable) | When the last reminder was sent. |
| **Last Escalated At** | timestamptz (nullable) | When the last escalation was sent. |
| **Snoozed Until** | timestamptz (nullable) | Reminders suppressed until this timestamp. |
| **Renewed From** | text (FK, nullable) | Reference to the previous version of this document (renewal chain). |
| **Created By** | text (FK) | User who created the record. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |
| **Metadata** | jsonb (nullable) | Domain-specific structured data. This is the extensibility point that makes the generic model work for taxation, audits, vehicle compliance, and any future use case without schema changes. See §1.3 for metadata conventions. |

**Operations**:
- `create(input)` — register a new compliance document. Validates category, derives initial verification status.
- `update(id, patch)` — update document details.
- `uploadAttachment(id, storageKey)` — attach or replace the document file.
- `submit(id)` — transition from `draft` to `submitted` (ready for review).
- `assignReviewer(id, userId)` — assign a user to review/verify the document.
- `assignTo(id, userId)` — assign a user responsible for completing/filing.
- `verify(id, reviewerId)` — transition from `under_review` to `verified`. Sets `reviewedAt`, `reviewedBy`.
- `reject(id, reviewerId, reason)` — transition to `rejected` with a reason.
- `complete(id, { completedAt, referenceNumber?, attachmentKey? })` — mark a due-date-based document as completed/filed. Sets `Completed At` and `Reference Number`.
- `markRenewalInProgress(id)` — set status to indicate renewal is underway.
- `renew(id, newData)` — create a new document linked via `Renewed From`, archive the old one. Copies reminder/escalation settings and metadata template.
- `archive(id)` — archive a document no longer required.
- `getById(id)` — fetch a single document with all metadata.
- `list(filters?)` — list documents with optional filters (category, status, branch, sourceModule, sourceEntity, expiringWithinDays, dueWithinDays, jurisdiction, reviewer, obligationId).
- `getExpiring(days)` — all documents with `Expiry Date` within N days that are `verified` or `submitted`.
- `getDueSoon(days)` — all documents with `Due Date` within N days that are not yet completed.
- `getExpired()` — all documents past their `Expiry Date` that are still active.
- `getOverdue()` — all documents past their `Due Date` that are not yet completed.
- `getRenewalChain(id)` — returns the full renewal history chain (current → all ancestors via `Renewed From`).
- `getBySource(sourceModule, sourceEntityType?, sourceEntityId?)` — all compliance documents for a specific source entity.
- `getByObligation(obligationId)` — all documents generated by a specific obligation.
- `snooze(id, days)` — suppress reminders for N days.

### 1.2 Compliance Document Status Machine

```
                       create()              submit()           assignReviewer()
                       ────────►             ────────►          ────────────────►
                   ┌──────────┐         ┌───────────┐        ┌──────────────┐     ┌──────────────┐
                   │  draft   │────────►│ submitted │───────►│ under_review │────►│  verified    │
                   └──────────┘         └───────────┘        └──────────────┘     └──────────────┘
                         │                     │                    │                     │
                         │                     │                    │                     │ expiry date
                         │                     │                    ▼                     │ passes OR
                         │                     │              ┌─────────┐               │ due date
                         │                     │              │rejected │               │ passes
                         │                     │              └─────────┘          ┌──────────┐
                         │                     │                    │              │ expired  │ ←── expiry-based
                         │                     │                    │              │ overdue  │ ←── due-date-based
                         │                     └────────────────────┘                    │
                         │                                                               │ renew() /
                         │                                                               │ complete()
                         └───────────────────────────────────────────────────────────────►│
                                                                                          ▼
                                                                                    ┌──────────┐
                                                                                    │ renewed  │
                                                                                    └──────────┘
```

**Status derivation rules** (automatic, via scheduled job):
- `verified` + expiry within first `Reminder Days` threshold → `verified` remains, but reminder fires.
- `verified` + `Expiry Date` passed → auto-transition to `expired`.
- `submitted` + `Expiry Date` passed → auto-transition to `expired` (never verified before expiry).
- Any non-terminal status + `Due Date` passed + not `Completed` → auto-transition to `overdue`.
- `draft` documents are never auto-transitioned (incomplete).
- `archived` and `renewed` are terminal — no auto-transitions.

**Expiry vs. Due Date**: A document uses either `Expiry Date` (for things that are currently valid and will lapse — certificates, licenses, permits) or `Due Date` (for things that must be completed by a deadline — tax filings, audit reports, periodic submissions). The reminder engine checks whichever is set. A document may have both (e.g., a filing that must be submitted by a due date and then is valid until an expiry date) — in that case reminders fire on whichever comes first.

### 1.3 Metadata Conventions

The `metadata` jsonb field is the extensibility point that eliminates the need for domain-specific tables. While the schema is free-form, the module defines conventions for common use cases:

| Use Case | Conventional metadata keys |
|---|---|
| **Tax filings** | `taxType` (`gst`, `vat`, `income_tax`, etc.), `jurisdiction` (e.g., `IN-GST`), `returnForm` (e.g., `GSTR-1`), `taxAmount` (numeric), `amountPaid` (numeric), `outstanding` (numeric, computed), `currency` (ISO 4217), `penaltyAmount` (numeric), `filingPortalUrl` (string), `filingReference` (string) |
| **Certificates** | `certifyingBody`, `score` or `grade`, `scope` (e.g., "Design, Development, and Support") |
| **Insurance** | `policyNumber`, `coverageType`, `sumInsured`, `premiumAmount`, `beneficiary` |
| **Vehicle compliance** | `vehicleRegistration`, `emissionNorms`, `fitnessValidUntil` |
| **HR compliance** | `employeeId`, `checkType` (e.g., `criminal`, `education`, `employment`), `verificationAgency` |
| **Audits** | `auditScope`, `auditor` (internal/external), `findings`, `rating` |

These are conventions, not enforced schemas. Source modules populate `metadata` with whatever structured data they need. The Compliance Module treats `metadata` as opaque — it stores, retrieves, and passes it through to events and audit trails without interpreting its contents. Consumers (dashboards, reports, other modules) read specific keys based on the document's `category` and `documentType`.

---

## 2. Compliance Obligations

A recurring schedule that auto-generates compliance documents on a periodic basis. Obligations replace the need for domain-specific recurring entities (tax filing schedules, annual certificate renewal reminders, quarterly audit schedules). Any periodic compliance need — whether it originates from Accounting (tax returns), HR (annual background check renewals), Fleet (vehicle pollution certificates), or Operations (safety audits) — is modeled as a Compliance Obligation that produces documents according to its frequency.

### 2.1 Compliance Obligation

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Descriptive name (e.g., "Monthly GST Returns", "Annual ISO 9001 Renewal", "Quarterly Fire Safety Audit", "Annual Vehicle Pollution Certificate"). |
| **Category** | enum | Same category enum as compliance documents. Determines the category of generated documents. |
| **Document Type** | text (nullable) | Sub-type for generated documents (e.g., "GST Return", "ISO 9001", "Fire Safety Audit"). |
| **Frequency** | enum | `monthly`, `quarterly`, `semi_annual`, `annual`, `biennial`, `triennial`, `custom`. |
| **Custom Cron** | text (nullable) | Cron expression for `custom` frequency (e.g., `0 0 1 */3 *` for every 3 months on the 1st). 5-placeholder format (minute-level precision). |
| **Due Day** | integer (nullable) | Day of month the generated document's `Due Date` falls on (for due-date-based obligations like tax filings). |
| **Due Month Offset** | integer (nullable) | Months after period end when the document is due (e.g., 1 = file by next month, 0 = same month). |
| **Expiry Based** | boolean | If `true`, generated documents track `Expiry Date` (certificates, permits). If `false`, generated documents track `Due Date` (filings, audits). Default `false`. |
| **Expiry Duration Months** | integer (nullable) | For expiry-based obligations: how many months from generation until the document expires (e.g., 12 for an annual certificate). |
| **Period Based** | boolean | If `true`, generated documents include `Period Start` and `Period End` fields (for tax periods, audit periods). Default `false`. |
| **Default Reminder Days** | integer[] | Reminder days inherited by generated documents. Default `[30, 15, 7, 1]` for due-date-based, `[90, 60, 30, 7]` for expiry-based. |
| **Default Escalation Days** | integer[] (nullable) | Escalation days inherited by generated documents. |
| **Default Metadata** | jsonb (nullable) | Template for generated documents' `metadata` field (e.g., `{ "taxType": "gst", "jurisdiction": "IN-GST", "returnForm": "GSTR-1", "currency": "INR" }`). Merged into each generated document. |
| **Default Issuing Authority** | text (nullable) | Default `Issuing Authority` for generated documents. |
| **Default Jurisdiction** | text (nullable) | Default `Jurisdiction` for generated documents. |
| **Default Assigned Reviewer** | text (FK, nullable) | Default reviewer for generated documents. |
| **Default Assigned To** | text (FK, nullable) | Default user responsible for completing generated documents. |
| **Source Module** | text | The module that owns this obligation (e.g., `accounting`, `organization`, `fleet`). |
| **Source Entity Type** | text (nullable) | Source entity type if the obligation is entity-specific. |
| **Source Entity ID** | text (nullable) | Source entity ID if the obligation is entity-specific. |
| **Branch** | text (FK, nullable) | Branch reference if the obligation is branch-specific. |
| **Start Date** | date | When this obligation begins generating documents. |
| **End Date** | date (nullable) | When this obligation stops generating documents. Null = ongoing. |
| **Is Active** | boolean | Whether the obligation is currently generating documents. Default `true`. |
| **Auto-Generate** | boolean | Whether to auto-create compliance documents when a new period begins. Default `true`. |
| **Created By** | text (FK) | User who created the obligation. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — define a recurring compliance obligation.
- `update(id, patch)` — update obligation parameters.
- `activate(id)` / `deactivate(id)` — toggle whether new documents are auto-generated.
- `generateDocuments(id, upToDate)` — manually trigger document generation up to a given date. Returns generated document IDs.
- `list(filters?)` — list obligations with filters (category, sourceModule, active, expiryBased).
- `getById(id)` — fetch a single obligation.
- `getUpcomingPeriods(id, count)` — preview the next N periods that would be generated. Returns computed `{ periodStart, periodEnd, dueDate | expiryDate }` tuples without creating documents.
- `getGeneratedDocuments(id)` — all documents created by this obligation.

### 2.2 Auto-Generation Logic

A scheduled job (`compliance:obligation-generate`) runs daily and checks all active obligations. For each, it computes whether a new compliance period has begun and, if so, auto-creates a `Compliance Document` with:

- `Name` — derived from the obligation name + period label (e.g., "Monthly GST Returns — April 2025").
- `Category`, `Document Type`, `Issuing Authority`, `Jurisdiction` — copied from obligation defaults.
- `Expiry Date` or `Due Date` — computed from the frequency, `Due Day`, `Due Month Offset`, or `Expiry Duration Months`.
- `Period Start`, `Period End` — computed if `Period Based` is true.
- `Reminder Days`, `Escalation Days` — copied from obligation defaults.
- `Assigned Reviewer`, `Assigned To` — copied from obligation defaults.
- `Source Module`, `Source Entity Type`, `Source Entity ID`, `Branch` — copied from obligation.
- `Obligation ID` — set to the obligation's ID.
- `Metadata` — merged from `Default Metadata` template.
- `Verification Status` — `draft` (awaiting submission).
- `Created By` — set to the obligation's `Created By`.

**Period computation** (examples):

| Obligation | Frequency | Due Day | Month Offset | Generated Document |
|---|---|---|---|---|
| Monthly GST Returns | `monthly` | 20 | 1 | Period: 2025-04-01 → 2025-04-30. Due: 2025-05-20. |
| Quarterly Safety Audit | `quarterly` | 30 | 0 | Period: 2025-07-01 → 2025-09-30. Due: 2025-09-30. |
| Annual ISO 9001 Renewal | `annual` (expiry-based) | — | — | No period. Expiry: 12 months from issue. |
| Annual Corporate Tax | `annual` | 31 | 7 | Period: FY2025-26. Due: 7 months after FY end. |

**Idempotency**: The generation job checks whether a document already exists for a given `(obligationId, periodStart, periodEnd)` tuple. If so, it skips generation — no duplicates.

---

## 3. Verification Workflow

The verification workflow ensures that submitted compliance documents are reviewed and approved by authorized personnel before being considered compliant.

### 3.1 Verification Reviewer Assignment

When a document is submitted (`submit()`), it enters `submitted` status. A compliance officer or designated reviewer is then assigned.

- **Auto-assignment**: if `category` matches a rule in `VerificationRule`, the reviewer is auto-assigned.
- **Manual assignment**: `assignReviewer(id, userId)` transitions to `under_review`.
- **Reviewer must have `compliance:reviewer` role** (see §10 RBAC).

### 3.2 Verification Rules

Configurable rules that auto-assign reviewers and set verification requirements based on document category and source module.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Rule name (e.g., "HR documents → HR Manager"). |
| **Category** | enum (nullable) | Document category to match. Null = matches all. |
| **Source Module** | text (nullable) | Source module to match. Null = matches all. |
| **Assigned Reviewer** | text (FK, nullable) | User to auto-assign when rule matches. |
| **Required Reviewer Role** | text (nullable) | Role required to verify (e.g., `compliance:officer`). |
| **Is Active** | boolean | Whether the rule is active. |
| **Priority** | integer | Lower = higher priority. First match wins. |
| **Created At** | timestamptz | Record creation timestamp. |

**Operations**:
- `create(input)` — create a verification rule.
- `update(id, patch)` — update rule.
- `delete(id)` — delete rule.
- `list(filters?)` — list rules sorted by priority.
- `match(document)` — find the first matching rule for a given document (used internally on `submit()`).

### 3.3 Rejection & Resubmission

When a document is rejected:
1. Status transitions to `rejected`.
2. `Rejection Reason` is recorded.
3. A `compliance:document_rejected` event is published via PubSub.
4. The source module (or the user who submitted) is notified.
5. The document can be updated and resubmitted — `submit()` transitions from `rejected` back to `submitted`.

---

## 4. Expiry & Reminder Engine

The reminder engine is the core proactive component. It uses pg-boss scheduling to run periodic jobs that scan for expiring/expired documents, overdue documents, and pending obligation generation — then publishes reminder events through PubSub for downstream notification delivery.

### 4.1 Scheduled Jobs (pg-boss `schedule()`)

The following recurring jobs are registered during module `prepare()` via `pubsub.schedule(name, cron, data, options)`:

| Job Name | Cron | Schedule | Purpose |
|---|---|---|---|
| `compliance:daily-expiry-scan` | `0 8 * * *` | Daily at 08:00 UTC | Scans all documents with `Expiry Date` or `Due Date`. For each, checks if `daysUntilExpiry`/`daysUntilDue` hits a `Reminder Days` threshold. If so, publishes `compliance:document_expiring` or `compliance:document_due` event. |
| `compliance:daily-status-transition` | `0 0 * * *` | Daily at midnight UTC | Transitions documents past their `Expiry Date` to `expired` and documents past their `Due Date` (not completed) to `overdue`. Publishes `compliance:document_expired` and `compliance:document_overdue` events. |
| `compliance:daily-escalation` | `0 9 * * *` | Daily at 09:00 UTC | For documents in `expired` or `overdue` status, checks if `daysSinceExpiry`/`daysSinceOverdue` hits an `Escalation Days` threshold. Publishes `compliance:document_escalated` events. |
| `compliance:obligation-generate` | `0 6 * * *` | Daily at 06:00 UTC | Checks all active `ComplianceObligation` records. For each, determines if a new compliance period has begun and auto-creates a `Compliance Document`. |
| `compliance:weekly-summary` | `0 9 * * 1` | Mondays at 09:00 UTC | Aggregates compliance status for the past week. Publishes `compliance:weekly_summary` event with counts, upcoming expirations, overdue items, and obligation generation summary. |

**Job registration**: All schedules are registered in the module's `prepare()` method. Each job name corresponds to a pg-boss queue that the module subscribes to via `pubsub.subscribe()`. The handler performs the scan and publishes domain events.

**Singleton enforcement**: Each scheduled job uses `singletonKey` to prevent duplicate execution across multiple framework instances (via `pubsub.publish()` with `singletonKey` option).

**Example registration flow** (in `prepare()`):
```ts
// Register cron schedules
await pubsub.schedule("compliance:daily-expiry-scan", "0 8 * * *", {}, {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
})
await pubsub.schedule("compliance:daily-status-transition", "0 0 * * *", {}, {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
})
await pubsub.schedule("compliance:obligation-generate", "0 6 * * *", {}, {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
})

// Subscribe handlers
await pubsub.subscribe("compliance:daily-expiry-scan", async (message) => {
  await this.reminderEngine.scanExpiringAndDueDocuments()
})
await pubsub.subscribe("compliance:daily-status-transition", async (message) => {
  await this.reminderEngine.transitionExpiredAndOverdueDocuments()
})
await pubsub.subscribe("compliance:obligation-generate", async (message) => {
  await this.obligationService.generatePendingDocuments()
})
```

### 4.2 Reminder Event Flow

```
  pg-boss schedule()          daily-expiry-scan handler         PubSub publish()
  ┌─────────────────┐          ┌──────────────────────┐        ┌───────────────────────┐
  │ Cron fires at   │          │ Query all documents   │        │ compliance:            │
  │ 08:00 UTC       │─────────►│ with Expiry Date or   │───────►│ document_expiring     │──► subscribers
  │                 │          │ Due Date. For each,   │        │ document_due          │   (notification
  │                 │          │ check if days-until   │        │ + daysUntilExpiry     │    service, email,
  └─────────────────┘          │ hits a threshold.     │        │ + document summary    │    Slack, etc.)
                               │ Update lastNotifiedAt.│        └───────────────────────┘
                               └──────────────────────┘
```

### 4.3 Escalation Matrix

When a document expires or becomes overdue, reminders escalate based on `Escalation Days`:

| Days After Expiry/Overdue | Escalation Level | Recipients |
|---|---|---|
| 1 | Level 1 — Document owner + assigned reviewer/assignee | User who created the document + assigned reviewer (or `Assigned To` for due-date-based) |
| 7 | Level 2 — Branch/department manager | Level 1 recipients + branch manager (if branch-specific) |
| 30 | Level 3 — Compliance officer / admin | Level 2 recipients + all users with `compliance:admin` role |

The escalation levels are configurable via `Escalation Days` on each document. If `Escalation Days` is null, no escalation occurs — only the initial expiry/overdue notification is sent.

### 4.4 Reminder Deduplication

- `Last Notified At` on the document record prevents duplicate reminders within the same threshold window.
- A document is only notified once per `Reminder Days` threshold — e.g., if `Reminder Days = [90, 60, 30, 7]` and the document is at 45 days, only the 60-day reminder fires (the 90-day already fired).
- If the daily scan runs and the document is at 58 days, no new notification is sent (already notified at the 60-day threshold; next notification at the 30-day threshold).

### 4.5 Snooze

- `snooze(id, days)` — temporarily suppress reminders for a document for N days.
- Sets the `Snoozed Until` field (timestamptz). The daily scan skips documents where `Snoozed Until > now()`.
- After the snooze period expires, normal reminder behavior resumes.
- Snooze does not affect the `Verification Status`, `Expiry Date`, or `Due Date` — it only suppresses notifications.

### 4.6 Framework Enhancement: PubSubUnit `schedule()` / `unschedule()`

The current `PubSubUnit` wraps pg-boss but does not expose the `schedule()`, `unschedule()`, or `getSchedules()` methods. The Compliance module requires these for cron-based job scheduling.

**Required additions to `PubSubUnit`:**

```ts
async schedule(
  topic: string,
  cron: string,
  data?: unknown,
  options?: ScheduleOptions,
): Promise<void>

async unschedule(topic: string, key?: string): Promise<void>

async getSchedules(topic?: string): Promise<Schedule[]>
```

Where `ScheduleOptions` extends `PublishOptions` with:
- `tz?: string` — timezone for cron evaluation (default: UTC)
- `key?: string` — unique key for multiple schedules on the same queue

This enhancement is a prerequisite for the Compliance module. It benefits all future modules that need cron scheduling (e.g., a Payroll module for salary processing, an Inventory module for stock audits).

---

## 5. Compliance Audit Trail

An immutable, append-only log of every action taken on a compliance document or obligation. Required for regulatory audits and internal accountability.

### 5.1 Audit Entry

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Entity Type** | enum | `compliance_document`, `compliance_obligation`, `verification_rule`. |
| **Entity ID** | text (FK) | Reference to the entity. |
| **Action** | enum | `created`, `updated`, `submitted`, `verified`, `rejected`, `expired`, `overdue`, `renewed`, `archived`, `completed`, `escalated`, `reminder_sent`, `snoozed`, `attachment_uploaded`, `reviewer_assigned`, `obligation_activated`, `obligation_deactivated`, `document_generated`. |
| **Performed By** | text (FK, nullable) | User who performed the action. Null for system/scheduled actions. |
| **Performed At** | timestamptz | When the action occurred. |
| **Previous State** | jsonb (nullable) | Snapshot of relevant fields before the action. |
| **New State** | jsonb (nullable) | Snapshot of relevant fields after the action. |
| **Changes** | jsonb (nullable) | Diff of changed fields `{ field: { old, new } }`. |
| **Notes** | text (nullable) | Optional context or reason. |
| **Metadata** | jsonb (nullable) | Additional structured data (e.g., reminder threshold hit, escalation level, obligation period). |

**Operations**:
- `getAuditTrail(entityType, entityId)` — returns all audit entries for an entity, ordered chronologically.
- `list(filters?)` — list audit entries with filters (entityType, action, performedBy, dateRange).
- `export(filters?)` — generate a CSV/JSON export of audit entries for a date range (for regulatory reporting).

**Constraints**:
- Append-only — no updates or deletes.
- Every state-changing operation on compliance documents and obligations writes an audit entry.
- System-generated actions (scheduled job transitions, reminders, auto-generation) record `Performed By` as null and include a `system: true` flag in metadata.

---

## 6. Compliance Dashboard

Aggregated, real-time view of the organization's compliance posture.

### 6.1 Summary Metrics

| Metric | Description |
|---|---|
| **Total Documents** | Count of all non-archived compliance documents. |
| **Verified** | Documents with `verified` status. |
| **Pending Review** | Documents with `submitted` or `under_review` status. |
| **Expiring Soon** | Documents with `Expiry Date` within 30 days (configurable). |
| **Due Soon** | Documents with `Due Date` within 30 days (configurable). |
| **Expired** | Documents with `expired` status. |
| **Overdue** | Documents with `overdue` status. |
| **Rejected** | Documents with `rejected` status. |
| **By Category** | Document counts grouped by category. |
| **By Source Module** | Document counts grouped by source module. |
| **By Branch** | Document counts grouped by branch. |
| **By Status** | Document counts grouped by verification status. |
| **Active Obligations** | Count of active compliance obligations. |
| **Documents Generated (30d)** | Count of documents auto-generated by obligations in the past 30 days. |

### 6.2 Expiry & Due Date Timeline

A visual timeline showing upcoming document expirations and due dates over the next 30/60/90/180 days. Each entry includes:
- Document name, category, source module, document type
- Expiry date or due date, days remaining
- Assigned reviewer / assignee
- Status (verified, submitted, etc.)
- Whether reminders have been sent
- Whether the document was auto-generated by an obligation

### 6.3 Compliance Health Score

A simple computed score (0-100) representing overall compliance health:
- **Weighted formula**: verified documents contribute positively, expired/overdue/rejected items contribute negatively.
- **Factors**: % verified, % expired, % overdue, % pending review past SLA.
- **Purpose**: quick at-a-glance indicator for leadership. Not a regulatory metric.

---

## 7. Cross-Module Integration

The Compliance Module is designed to receive compliance documents from other domain modules. Integration happens through two patterns:

### 7.1 Direct API Integration

Other modules call the Compliance module's workflow directly. The generic document model adapts to any use case via `metadata`:

```ts
// HR module registering a compliance requirement for a new employee
framework.compliance.documents.create({
  name: "Background Check Verification",
  category: "hr",
  documentType: "background_check",
  sourceModule: "hr",
  sourceEntityType: "employee",
  sourceEntityId: employeeId,
  expiryDate: new Date("2026-07-10"),
  reminderDays: [30, 7],
  createdBy: userId,
  metadata: { employeeId, checkType: "criminal" },
})

// Fleet module registering a vehicle's pollution certificate
framework.compliance.documents.create({
  name: "Vehicle Pollution Certificate — MH-12-AB-1234",
  category: "vehicle",
  documentType: "pollution_certificate",
  sourceModule: "fleet",
  sourceEntityType: "vehicle",
  sourceEntityId: vehicleId,
  expiryDate: new Date("2026-06-15"),
  renewalFrequency: "annual",
  reminderDays: [60, 30, 7],
  createdBy: userId,
  metadata: { vehicleRegistration: "MH-12-AB-1234", emissionNorms: "BS6" },
})

// Accounting module registering a tax filing via the generic document model
framework.compliance.documents.create({
  name: "GSTR-1 April 2025",
  category: "tax",
  documentType: "GST Return",
  jurisdiction: "IN-GST",
  dueDate: new Date("2025-05-20"),
  periodStart: new Date("2025-04-01"),
  periodEnd: new Date("2025-04-30"),
  reminderDays: [7, 3, 1],
  assignedTo: accountantId,
  createdBy: userId,
  metadata: {
    taxType: "gst",
    returnForm: "GSTR-1",
    taxAmount: 125000,
    amountPaid: 0,
    currency: "INR",
    filingPortalUrl: "https://gst.gov.in",
  },
})

// Accounting module setting up a recurring monthly GST obligation
framework.compliance.obligations.create({
  name: "Monthly GST Returns",
  category: "tax",
  documentType: "GST Return",
  frequency: "monthly",
  expiryBased: false,
  periodBased: true,
  dueDay: 20,
  dueMonthOffset: 1,
  defaultReminderDays: [7, 3, 1],
  defaultAssignedTo: accountantId,
  sourceModule: "accounting",
  startDate: new Date("2025-04-01"),
  defaultMetadata: {
    taxType: "gst",
    jurisdiction: "IN-GST",
    returnForm: "GSTR-1",
    currency: "INR",
    filingPortalUrl: "https://gst.gov.in",
  },
  createdBy: userId,
})

// Operations module setting up a recurring annual safety audit
framework.compliance.obligations.create({
  name: "Annual Fire Safety Audit",
  category: "audit",
  documentType: "Fire Safety Audit",
  frequency: "annual",
  expiryBased: false,
  periodBased: true,
  dueDay: 31,
  dueMonthOffset: 0,
  defaultReminderDays: [60, 30, 7],
  sourceModule: "organization",
  startDate: new Date("2025-01-01"),
  defaultMetadata: { auditScope: "Fire Safety", auditor: "External" },
  createdBy: userId,
})
```

### 7.2 Event-Driven Integration

The Compliance Module subscribes to domain events from other modules and auto-creates compliance requirements:

| Subscribed Event | Compliance Action |
|---|---|
| `hr:employee_onboarded` | Create compliance documents: background check, ID verification, tax forms (e.g., W-4, Form 12BB). Each with appropriate `metadata`. |
| `hr:employee_separated` | Create compliance documents: exit documents, final settlement, experience letter. |
| `fleet:vehicle_registered` | Create compliance documents: pollution certificate, insurance, registration renewal. Also create an annual renewal obligation. |
| `organization:branch_created` | Create compliance documents: trade license, fire safety certificate, local permits. Also create recurring obligations for annual renewals. |
| `accounting:financial_year_started` | Create compliance obligations for the new financial year (monthly/quarterly tax returns). |
| `organization:connection_created` (type=insurer) | Create insurance compliance document requirement. |

**Event subscription**: During `initialize()`, the Compliance module subscribes to relevant PubSub topics. Each handler creates the appropriate compliance document or obligation with default reminder/escalation settings based on the category.

### 7.3 Integration Contract

Modules that submit compliance documents must provide:
- `sourceModule` — identifies the originating module.
- `sourceEntityType` — the type of entity (e.g., `employee`, `vehicle`, `branch`).
- `sourceEntityId` — the entity's ID for traceability.
- `category` — from the compliance category enum.
- `name` — human-readable document name.
- `metadata` — domain-specific structured data (free-form, module-defined).

The Compliance Module does NOT validate the source entity's existence or interpret the `metadata` contents — it trusts the source module. This keeps the integration loosely coupled and allows any module to store arbitrary compliance data without schema changes.

### 7.4 Bi-directional Events

The Compliance Module also publishes events that other modules may subscribe to:

| Event | Payload | Consumer Use Case |
|---|---|---|
| `compliance:document_verified` | `{ documentId, sourceModule, sourceEntityId, category }` | HR module unlocks employee onboarding tasks once background check is verified. |
| `compliance:document_rejected` | `{ documentId, sourceModule, sourceEntityId, reason, category }` | HR module flags employee record for missing/invalid documentation. |
| `compliance:document_expired` | `{ documentId, sourceModule, sourceEntityId, category }` | Fleet module marks vehicle as non-compliant / off-road. |
| `compliance:document_overdue` | `{ documentId, sourceModule, sourceEntityId, category, daysOverdue }` | Accounting module triggers penalty accrual for overdue tax filing. |
| `compliance:document_expiring` | `{ documentId, sourceModule, sourceEntityId, daysUntilExpiry }` | Source module shows UI warnings. |
| `compliance:document_due` | `{ documentId, sourceModule, sourceEntityId, daysUntilDue }` | Source module shows upcoming deadline warnings. |
| `compliance:document_completed` | `{ documentId, sourceModule, sourceEntityId, completedAt, referenceNumber }` | Accounting module records filed return reference. |
| `compliance:document_generated` | `{ documentId, obligationId, sourceModule }` | Source module is notified that an obligation auto-generated a document. |

---

## 8. Data Model Summary

| Domain | Key Tables |
|---|---|
| **Document Registry** | `compliance_document` |
| **Recurring Obligations** | `compliance_obligation` |
| **Verification** | `compliance_verification_rule` |
| **Audit** | `compliance_audit_entry` |
| **Dashboard** | (computed — no tables) |

### Table Indexes

```
compliance_document:
  - idx_compliance_document_category (category)
  - idx_compliance_document_status (verification_status)
  - idx_compliance_document_branch (branch)
  - idx_compliance_document_expiry (expiry_date)
  - idx_compliance_document_due (due_date)
  - idx_compliance_document_source (source_module, source_entity_type, source_entity_id)
  - idx_compliance_document_reviewer (assigned_reviewer)
  - idx_compliance_document_assignee (assigned_to)
  - idx_compliance_document_obligation (obligation_id)
  - idx_compliance_document_renewed_from (renewed_from)

compliance_obligation:
  - idx_compliance_obligation_active (is_active)
  - idx_compliance_obligation_category (category)
  - idx_compliance_obligation_source (source_module, source_entity_type, source_entity_id)

compliance_audit_entry:
  - idx_compliance_audit_entity (entity_type, entity_id)
  - idx_compliance_audit_action (action)
  - idx_compliance_audit_performed_by (performed_by)
  - idx_compliance_audit_performed_at (performed_at)
```

---

## 9. Dependencies & Prerequisites

| Dependency | Reason | Status |
|---|---|---|
| **DB Unit** | Drizzle ORM for all compliance tables. | ✅ Available |
| **PubSub Unit** | Event publishing, job scheduling, cron registration via pg-boss. | ✅ Available (publish/subscribe) |
| **PubSub Unit `schedule()`** | Cron scheduling for daily expiry scans, status transitions, obligation generation. | ⚠️ **Requires enhancement** — expose `schedule()`, `unschedule()`, `getSchedules()` on `PubSubUnit`. |
| **Auth Unit** | User identity for ownership, reviewer assignment, RBAC. | ✅ Available |
| **Storage Unit** | Document attachment uploads. | ✅ Available |
| **KV Store Unit** | Caching dashboard summary metrics, snooze state, idempotency keys for scheduled jobs. | ✅ Available |
| **Organization Module** | Branch and Connection references on compliance documents. | ✅ Available |
| **HR Module** (optional) | Employee references for HR-originated compliance documents. | 📦 Optional |
| **Fleet Module** (optional) | Vehicle references for fleet-originated compliance documents. | 📦 Stub |
| **Accounting Module** (optional) | Creates tax compliance documents and obligations via the generic model. | 📦 Stub |

### PubSubUnit Enhancement Detail

The current `PubSubUnit` (`packages/framework/src/server/pubsub/index.ts`) wraps pg-boss but only exposes `publish`, `publishBatch`, `subscribe`, `unsubscribe`, `getQueueSize`, `purgeQueue`. The `schedule()`, `unschedule()`, and `getSchedules()` methods on the underlying `PgBoss` instance are not surfaced.

**Changes required:**

1. Add `ScheduleOptions` type to `pubsub/types.ts`:
   ```ts
   export interface ScheduleOptions extends PublishOptions {
     tz?: string;
     key?: string;
   }
   ```

2. Add methods to `PubSubUnit`:
   ```ts
   async schedule(topic: string, cron: string, data?: unknown, options?: ScheduleOptions): Promise<void>
   async unschedule(topic: string, key?: string): Promise<void>
   async getSchedules(topic?: string): Promise<unknown[]>
   ```

3. These delegate to `this.boss.schedule()`, `this.boss.unschedule()`, and `this.boss.getSchedules()` respectively.

4. Ensure `this.boss` is accessible (currently private — either make it accessible to the new methods within the class, or expose a getter for the underlying instance).

---

## 10. RBAC Model

### Roles

| Role | Description |
|---|---|
| `compliance:admin` | Full access to all compliance resources. Can manage documents, obligations, verification rules, audit trail, and configuration. Can verify/reject any document. |
| `compliance:officer` | Can create and manage documents and obligations. Can be assigned as reviewer or assignee. Cannot delete verification rules or configure scheduled jobs. |
| `compliance:reviewer` | Can view all documents and verify/reject documents assigned to them. Cannot create or modify documents. |
| `compliance:viewer` | Read-only access to compliance dashboard and documents. Cannot modify anything. |

### Resource Permissions

| Action | compliance:admin | compliance:officer | compliance:reviewer | compliance:viewer |
|---|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| Create document | ✅ | ✅ | ❌ | ❌ |
| Update document | ✅ | ✅ (own) | ❌ | ❌ |
| Submit for review | ✅ | ✅ | ❌ | ❌ |
| Verify document | ✅ | ❌ | ✅ (assigned) | ❌ |
| Reject document | ✅ | ❌ | ✅ (assigned) | ❌ |
| Complete/filing | ✅ | ✅ (assigned) | ❌ | ❌ |
| Renew document | ✅ | ✅ | ❌ | ❌ |
| Archive document | ✅ | ✅ | ❌ | ❌ |
| Snooze reminder | ✅ | ✅ | ❌ | ❌ |
| Upload attachment | ✅ | ✅ | ❌ | ❌ |
| Create obligation | ✅ | ✅ | ❌ | ❌ |
| Manage verification rules | ✅ | ❌ | ❌ | ❌ |
| View audit trail | ✅ | ✅ | ✅ (relevant) | ❌ |
| Export audit trail | ✅ | ❌ | ❌ | ❌ |

### Module-Level Access Control

Modules submitting compliance documents programmatically (via direct API calls in `initialize()` or event handlers) bypass RBAC — they operate with system-level trust. RBAC applies to user-initiated actions via the RPC layer.

---

## 11. Domain Events

### 11.1 Document Lifecycle Events

| Event | Payload | Trigger |
|---|---|---|
| `compliance:document_created` | `{ document }` | Document created (manually or auto-generated). |
| `compliance:document_updated` | `{ document, changes }` | Document details modified. |
| `compliance:document_submitted` | `{ documentId, submittedBy }` | Document submitted for review. |
| `compliance:document_verified` | `{ documentId, verifiedBy, sourceModule, sourceEntityId, category }` | Document verified by reviewer. |
| `compliance:document_rejected` | `{ documentId, rejectedBy, reason, sourceModule, sourceEntityId, category }` | Document verification rejected. |
| `compliance:document_expiring` | `{ documentId, sourceModule, sourceEntityId, daysUntilExpiry }` | Expiry reminder triggered (expiry-based documents). |
| `compliance:document_due` | `{ documentId, sourceModule, sourceEntityId, daysUntilDue }` | Due date reminder triggered (due-date-based documents). |
| `compliance:document_expired` | `{ documentId, sourceModule, sourceEntityId, category }` | Document auto-transitioned to expired. |
| `compliance:document_overdue` | `{ documentId, sourceModule, sourceEntityId, category, daysOverdue }` | Document auto-transitioned to overdue. |
| `compliance:document_completed` | `{ documentId, sourceModule, sourceEntityId, completedAt, referenceNumber }` | Document marked as completed/filed. |
| `compliance:document_escalated` | `{ documentId, escalationLevel, daysSinceExpiry }` | Escalation triggered post-expiry/overdue. |
| `compliance:document_renewed` | `{ oldDocumentId, newDocumentId }` | Document renewed (new version created). |
| `compliance:document_archived` | `{ documentId }` | Document archived. |
| `compliance:document_reviewer_assigned` | `{ documentId, reviewerId }` | Reviewer assigned. |
| `compliance:document_attachment_uploaded` | `{ documentId, storageKey }` | Attachment uploaded. |
| `compliance:document_snoozed` | `{ documentId, snoozedUntil, snoozedBy }` | Reminder snoozed. |
| `compliance:document_generated` | `{ documentId, obligationId, sourceModule }` | Document auto-generated by an obligation. |

### 11.2 Obligation Events

| Event | Payload | Trigger |
|---|---|---|
| `compliance:obligation_created` | `{ obligation }` | Compliance obligation created. |
| `compliance:obligation_activated` | `{ obligationId }` | Obligation activated. |
| `compliance:obligation_deactivated` | `{ obligationId }` | Obligation deactivated. |
| `compliance:obligation_updated` | `{ obligation, changes }` | Obligation parameters modified. |

### 11.3 System Events

| Event | Payload | Trigger |
|---|---|---|
| `compliance:weekly_summary` | `{ summary }` | Weekly compliance summary generated. |
| `compliance:scheduled_job_executed` | `{ jobName, executionTime, recordsProcessed, errors }` | Scheduled job completed. |

---

## 12. Module Structure

```
packages/compliance/
├── index.ts                          # Module entry — implements Module interface
├── types.ts                          # Compliance module types & valibot schemas
├── db-schema.ts                      # Drizzle table definitions & pgEnums
├── event-map.ts                      # Compliance domain events & event map interfaces
├── workflows/
│   ├── document.ts                   # Compliance document lifecycle: CRUD, submit, verify, complete, renew
│   ├── obligation.ts                 # Obligation CRUD, document auto-generation
│   ├── verification.ts               # Verification rules CRUD, auto-assignment
│   ├── audit.ts                      # Audit trail queries, export
│   └── dashboard.ts                  # Dashboard summary metrics, health score
├── services/
│   ├── reminder-engine.ts            # Scheduled job handlers: expiry/due scan, escalation, status transition
│   ├── obligation-generator.ts       # Period computation, document auto-generation from obligations
│   ├── status-derivation.ts          # Verification status → expiry/overdue status derivation logic
│   ├── event-bridge.ts               # Subscribes to external module events, creates compliance docs/obligations
│   └── audit-writer.ts               # Writes audit entries on state transitions
└── constants.ts                      # Category enums, frequencies, reminder defaults, metadata conventions
```

### Module Implementation (index.ts)

```ts
import type { DatabaseUnit, PubSubUnit, KvStoreUnit } from "@aspen-os/framework/server";

import * as dbSchema from "./db-schema";
import { DocumentWorkflow } from "./workflows/document";
import { ObligationWorkflow } from "./workflows/obligation";
import { VerificationWorkflow } from "./workflows/verification";
import { AuditWorkflow } from "./workflows/audit";
import { DashboardWorkflow } from "./workflows/dashboard";
import { ReminderEngine } from "./services/reminder-engine";
import { ObligationGenerator } from "./services/obligation-generator";
import { EventBridge } from "./services/event-bridge";

export class ComplianceModule {
  static create(config: ComplianceModuleConfig): ComplianceModule {
    return new ComplianceModule(config);
  }

  constructor(private config: ComplianceModuleConfig) {}

  readonly db_schema = dbSchema;
  readonly name = "compliance";

  #documents: DocumentWorkflow | null = null;
  #obligations: ObligationWorkflow | null = null;
  #verification: VerificationWorkflow | null = null;
  #audit: AuditWorkflow | null = null;
  #dashboard: DashboardWorkflow | null = null;
  #reminderEngine: ReminderEngine | null = null;
  #obligationGenerator: ObligationGenerator | null = null;
  #eventBridge: EventBridge | null = null;

  get documents() { /* throw if not init */ return this.#documents!; }
  get obligations() { return this.#obligations!; }
  get verification() { return this.#verification!; }
  get audit() { return this.#audit!; }
  get dashboard() { return this.#dashboard!; }

  initialize(units: {
    db: DatabaseUnit;
    pubsub: PubSubUnit;
    kvStore: KvStoreUnit;
  }): void {
    this.#documents = new DocumentWorkflow(units.db.db, units.pubsub);
    this.#obligations = new ObligationWorkflow(units.db.db);
    this.#verification = new VerificationWorkflow(units.db.db);
    this.#audit = new AuditWorkflow(units.db.db);
    this.#dashboard = new DashboardWorkflow(units.db.db, units.kvStore);
    this.#reminderEngine = new ReminderEngine(
      units.db.db, units.pubsub, this.#documents,
    );
    this.#obligationGenerator = new ObligationGenerator(
      units.db.db, this.#documents, this.#obligations,
    );
    this.#eventBridge = new EventBridge(
      units.pubsub, this.#documents, this.#obligations,
    );
  }

  async prepare(): Promise<void> {
    // Register cron schedules on pg-boss
    await this.#reminderEngine!.registerSchedules();
    // Subscribe to scheduled job handlers
    await this.#reminderEngine!.registerHandlers();
    await this.#obligationGenerator!.registerHandler();
    // Subscribe to external module events for auto-creation
    await this.#eventBridge!.registerSubscriptions();
  }

  async destroy(): Promise<void> {
    // Unsubscribe handlers
    await this.#reminderEngine?.unregister();
    await this.#obligationGenerator?.unregister();
    await this.#eventBridge?.unregister();
    // Null out workflows
    this.#documents = null;
    this.#obligations = null;
    this.#verification = null;
    this.#audit = null;
    this.#dashboard = null;
    this.#reminderEngine = null;
    this.#obligationGenerator = null;
    this.#eventBridge = null;
  }
}

export type ComplianceModuleConfig = {
  country: "INDIA";
  defaultReminderDays?: number[];
  defaultEscalationDays?: number[];
  dashboardCacheTtl?: number; // seconds, default 300 (5 min)
};
```

---

## 13. Cross-Module Migration (Organization Module)

The Organization module currently contains a `ComplianceWorkflow` with its own `compliance_document` table. This SOW proposes migrating that functionality to the standalone Compliance Module.

### Migration Steps

1. **Create the Compliance Module** (`packages/compliance`) with the expanded data model.
2. **Migrate the `compliance_document` table**: the compliance module's schema is a superset of the organization module's table. The organization module's `complianceDocument` table definition is removed from `packages/organization/src/db-schema.ts`.
3. **Update Organization module**: `OrganizationModule.compliance` getter delegates to the Compliance module:
   ```ts
   // In OrganizationModule.initialize()
   // No longer creates its own ComplianceWorkflow
   // The framework.compliance module handles all compliance
   ```
4. **Event map consolidation**: Move `COMPLIANCE_EVENTS` from `packages/organization/src/event-map.ts` to `packages/compliance/src/event-map.ts`. The organization module re-exports or references the compliance module's events.
5. **Backward compatibility**: The Organization module's `compliance` getter can proxy to `framework.compliance.documents` for existing callers, or callers are updated to use `framework.compliance.documents` directly.

### Migration Impact

| File | Change |
|---|---|
| `packages/organization/src/db-schema.ts` | Remove `complianceDocument` table and related enums. |
| `packages/organization/src/workflows/compliance.ts` | Remove or convert to a thin proxy. |
| `packages/organization/src/schemas/compliance.ts` | Remove. |
| `packages/organization/src/event-map.ts` | Remove `COMPLIANCE_EVENTS` and related interfaces. |
| `packages/organization/src/types.ts` | Remove compliance types. |
| `packages/organization/src/index.ts` | Remove `ComplianceWorkflow` import and `#compliance` field/getter. |
| `packages/compliance/src/` | New module with expanded schema, workflows, and services. |
| `packages/compliance/package.json` | New package. |
| `packages/compliance/tsconfig.json` | New tsconfig. |
| Root `tsconfig.json` | Add `./packages/compliance` to workspace globs. |

---

## 14. Phase Sequencing

### Phase 1 — Core Document Registry & Expiry Engine

- Compliance document table with expanded schema (categories, verification status, source module tracking, due date, period fields, metadata).
- Document CRUD operations.
- Expiry and due-date status derivation logic (`active` → `expiring_soon`/`due_soon` → `expired`/`overdue`).
- pg-boss `schedule()` / `unschedule()` / `getSchedules()` enhancement on PubSubUnit.
- Daily expiry/due-date scan scheduled job.
- Daily status transition scheduled job (expired + overdue).
- Daily escalation scheduled job.
- Reminder deduplication via `Last Notified At` / `Last Escalated At`.
- Snooze functionality.
- Domain events for document lifecycle (created, expiring, due, expired, overdue, escalated, renewed, completed).
- Migration of Organization module's compliance document table.
- Basic RBAC (`compliance:admin`, `compliance:officer`, `compliance:viewer`).

### Phase 2 — Verification Workflow

- Verification status machine (`draft` → `submitted` → `under_review` → `verified` / `rejected`).
- Reviewer assignment (manual + auto via verification rules).
- Verification rules table and matching logic.
- Rejection with reason and resubmission flow.
- Audit trail entries for all verification transitions.
- Domain events for verification lifecycle.
- `compliance:reviewer` role.

### Phase 3 — Recurring Obligations

- Compliance Obligation table and CRUD.
- Period computation service (monthly, quarterly, annual, custom cron).
- Auto-generation of compliance documents from obligations (scheduled job).
- Obligation idempotency (no duplicate documents for the same period).
- Obligation activation/deactivation.
- Upcoming periods preview.
- Domain events for obligation lifecycle.
- Integration with Accounting module for tax obligations (when available).
- Integration with Fleet/Organization modules for renewal obligations.

### Phase 4 — Cross-Module Integration & Dashboard

- Event-driven intake: subscribe to HR, Fleet, Organization events → auto-create compliance documents and obligations.
- Bi-directional events: publish `document_verified`, `document_expired`, `document_overdue`, `document_completed`, etc. for source modules.
- Compliance dashboard: summary metrics, expiry/due timeline, health score.
- KV store caching for dashboard metrics.
- Weekly summary scheduled job.
- Audit trail export (CSV/JSON).
- Full RBAC enforcement.

---

## 15. Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Document CRUD & Schema | Medium | Expanded schema with source module tracking, verification status, dual expiry/due date, period fields, metadata. |
| Expiry & Due-Date Status Derivation | Medium | Threshold-based derivation with reminder/escalation days arrays. Dual-mode (expiry vs. due date). |
| PubSubUnit `schedule()` Enhancement | Low | Thin wrapper over existing pg-boss methods. ~20 lines of code + types. |
| Reminder Engine (scheduled jobs) | High | Multiple cron jobs, deduplication logic, escalation matrix, singleton enforcement, dual expiry/due-date scanning. |
| Verification Workflow | Medium | Status machine, reviewer assignment, verification rules matching. |
| Audit Trail | Medium | Append-only log, state snapshotting, diff computation, export. |
| Obligation CRUD | Low | Standard CRUD with frequency/cron configuration. |
| Obligation Auto-Generation | High | Period computation per frequency, due date / expiry date calculation, edge cases (month-end, leap years, fiscal year boundaries), idempotency. |
| Cross-Module Event Bridge | Medium | Subscribe to external events, map to compliance documents/obligations with appropriate metadata. |
| Dashboard & Health Score | Medium | Aggregation queries, KV cache, health score formula. |
| Organization Module Migration | Low | Data model is a superset; straightforward migration. |
| RBAC Enforcement | Low | Integration with Auth unit's access control system. |

---

## 16. Testing Focus Areas

### Document Lifecycle
- **Status transitions**: draft → submitted → under_review → verified/rejected → expired/overdue → renewed. Verify each transition is valid and invalid transitions are rejected.
- **Expiry derivation**: documents at various days-until-expiry correctly derive `expiring_soon` vs `active` based on configurable `Reminder Days`.
- **Due-date derivation**: due-date-based documents correctly derive `due_soon` and transition to `overdue` when the due date passes.
- **Dual mode**: documents with both `Expiry Date` and `Due Date` trigger reminders on whichever comes first.
- **Renewal chain**: renewing a document creates a new record linked via `Renewed From`, archives the old one, and the chain is queryable.
- **Source module isolation**: documents from different source modules are independently queryable via `getBySource()`.
- **Metadata passthrough**: domain-specific metadata is stored, retrieved, and passed through to events without interpretation.

### Reminder Engine
- **Scheduled job registration**: `schedule()` is called during `prepare()` with correct cron expressions. `getSchedules()` returns all registered schedules.
- **Expiry/due scan**: the daily scan correctly identifies documents hitting reminder thresholds (both expiry and due-date based) and publishes events. Does not re-notify within the same threshold window.
- **Status transition**: the midnight job correctly transitions documents past expiry to `expired` and past due date to `overdue`. Does not touch `draft`, `archived`, or `renewed` documents.
- **Escalation**: post-expiry/overdue escalation fires at the correct `Escalation Days` thresholds with the correct escalation level.
- **Snooze**: a snoozed document is skipped by the daily scan until the snooze period expires.
- **Singleton enforcement**: concurrent scheduled job executions do not produce duplicate notifications.
- **Deduplication**: a document notified at the 60-day threshold is not re-notified until the 30-day threshold.

### Verification Workflow
- **Auto-assignment**: submitting a document with a matching verification rule auto-assigns the reviewer.
- **Review state**: only `compliance:reviewer` (or admin) can verify/reject. Only assigned reviewer can verify (unless admin).
- **Rejection + resubmission**: a rejected document can be updated and resubmitted, transitioning back to `submitted`.

### Obligation Auto-Generation
- **Period computation**: obligation with `monthly` frequency correctly generates 12 documents per year with correct `Period Start`, `Period End`, and `Due Date`/`Expiry Date`.
- **Due date edge cases**: documents due on month-end dates, leap years, fiscal year boundaries.
- **Expiry-based generation**: obligation with `expiryBased: true` generates documents with `Expiry Date` computed from `Expiry Duration Months`.
- **Custom cron**: obligation with `custom` frequency and a cron expression generates documents on the correct schedule.
- **Idempotency**: running the generation job twice for the same period does not create duplicate documents.
- **Metadata merge**: `Default Metadata` from the obligation is correctly merged into each generated document.
- **Deactivation**: deactivating an obligation stops further document generation; existing documents are unaffected.
- **End date**: an obligation with an `End Date` stops generating documents after that date.

### Cross-Module Integration
- **Event-driven creation**: subscribing to `hr:employee_onboarded` creates the expected compliance documents with correct category, source module, and metadata.
- **Bi-directional events**: `compliance:document_verified` is published when a document is verified, and source modules can subscribe to it.
- **Missing source module**: if a source module is not installed, event subscriptions silently no-op (no crash).

### Audit Trail
- **Completeness**: every state-changing operation writes an audit entry with correct previous/new state snapshots.
- **Immutability**: audit entries cannot be updated or deleted.
- **System actions**: scheduled job transitions, reminders, and auto-generation record `Performed By` as null with `system: true` in metadata.

---

## 17. Out of Scope

- **Regulatory rule engine**: no automated compliance checking against external regulatory databases or government APIs. Document tracking is manual or event-driven, not rule-engine-driven.
- **OCR / document content extraction**: no automatic parsing of certificate contents, filing figures, or expiry dates from uploaded documents.
- **Email/SMS/Push notification delivery**: the module publishes events via PubSub; actual multi-channel delivery is handled by a future Notification module or external subscriber. The `Reminder Channel` field is advisory.
- **Multi-tenant compliance**: each framework instance manages compliance for a single organization. Multi-tenant compliance is a future concern.
- **Compliance scoring against external benchmarks**: the health score is a simple internal metric, not benchmarked against industry standards.
- **Document templates / form generation**: no pre-built templates for generating compliance documents (e.g., pre-filled tax return forms, certificate applications).
- **Digital signatures / e-signing**: no integration with digital signature providers. Verification is a manual workflow.
- **Integration with government portals**: no direct API integration with GST portals, income tax e-filing, or other government systems. `metadata.filingPortalUrl` is a reference link only.
- **Penalty auto-calculation**: penalty amounts (if stored in `metadata.penaltyAmount`) are manually entered. No complex penalty computation engine (interest-based, slab-based, etc.).
- **Compliance training management**: tracking employee compliance training completion, certifications, and expiry is a future HR module concern.
- **Policy management**: drafting, distributing, and acknowledging compliance policies (code of conduct, data privacy policy) is out of scope. This module tracks operational compliance documents, not policy documents.
- **Metadata schema enforcement**: the `metadata` jsonb field is free-form. The module defines conventions (§1.3) but does not validate metadata structure against per-category schemas. Source modules are responsible for the correctness of their metadata.
