# Recruitment Module — Scope of Work

> Scope of Work for a recruitment management module built on the `@aspen-os/platform`.

## Overview

The Recruitment Module manages the end-to-end hiring pipeline: job mandate creation and staffing planning, outbound prospect sourcing and tracking, inbound applicant management, and candidate evaluation through to offer and onboarding. It integrates with the HR module for employee master data, organizational structure, and onboarding workflows; the Auth unit for RBAC across seven recruitment roles; the Storage unit for resumes and attachments; and the PubSub unit for notifications and reminders.

The module follows the existing RBAC model defined in the recruiter app, which establishes seven roles (Admin, Business Development, Caller, Quality Control, Relationship Manager, Sourcing Consultant, Team Lead) and twelve permission resources.

---

## 1. Job Mandate Management

### 1.1 Client

Organization or company for which recruitment services are provided.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Client company name. |
| **Industry** | text (nullable) | Industry sector. |
| **Website** | text (nullable) | Company website URL. |
| **Address** | text (nullable) | Primary address. |
| **Contact Person** | text (nullable) | Primary contact name. |
| **Contact Email** | text (nullable) | Primary contact email. |
| **Contact Phone** | text (nullable) | Primary contact phone. |
| **Status** | enum | `active`, `inactive`, `archived`. |
| **Notes** | text (nullable) | Internal notes. |
| **Created By** | text (FK) | User who created the record. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new client.
- `update(id, patch)` — update client details.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.

### 1.2 Client Contract

Agreement or engagement terms with a client.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Client** | text (FK) | Reference to client. |
| **Contract Type** | enum | `retained`, `contingency`, `container`, `temp_staffing`. |
| **Start Date** | date | Contract start. |
| **End Date** | date (nullable) | Contract end (null for open-ended). |
| **Fee Structure** | text (nullable) | Fee description (e.g., 20% of annual CTC, flat fee). |
| **Payment Terms** | text (nullable) | Payment schedule and terms. |
| **Guarantee Period** | integer (nullable) | Replacement guarantee in days. |
| **Status** | enum | `draft`, `active`, `expired`, `terminated`. |
| **Document** | text (FK, nullable) | Reference to Storage unit for signed contract file. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

### 1.3 Staffing Plan

Strategic manpower planning at the organizational level.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Client** | text (FK) | Reference to client. |
| **Department** | text | Target department. |
| **Designation** | text | Target job title. |
| **Number of Vacancies** | integer | Planned headcount. |
| **Estimated Cost Per Hire** | numeric (nullable) | Budget per hire. |
| **Planned Budget** | numeric (nullable) | Total budget for the plan. |
| **Status** | enum | `draft`, `approved`, `filled`, `cancelled`. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

- New Job Mandates are validated against the Staffing Plan to prevent over-hiring.

### 1.4 Job Requisition

Formal request from a client or internal team to fill a position.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Client** | text (FK) | Reference to client. |
| **Staffing Plan** | text (FK, nullable) | Link to staffing plan if applicable. |
| **Designation** | text | Job title. |
| **Department** | text (nullable) | Target department. |
| **Number of Positions** | integer | How many people to hire. |
| **Job Description** | text (markdown) | Full job description. |
| **Requirements** | text (markdown) | Skills, qualifications, experience required. |
| **Urgency** | enum | `low`, `medium`, `high`, `critical`. |
| **Salary Range Min** | numeric (nullable) | Minimum offered salary. |
| **Salary Range Max** | numeric (nullable) | Maximum offered salary. |
| **Location** | text (nullable) | Work location. |
| **Employment Type** | enum | `full_time`, `part_time`, `contract`, `internship`, `temporary`. |
| **Justification** | text (nullable) | Business justification for the hire. |
| **Status** | enum | `draft`, `pending_approval`, `approved`, `rejected`, `cancelled`. |
| **Requested By** | text (FK) | User who raised the requisition. |
| **Approved By** | text (FK, nullable) | User who approved the requisition. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new requisition (status: draft).
- `submit(id)` — submit for approval (status: pending_approval).
- `approve(id, userId)` — approve the requisition.
- `reject(id, userId, reason)` — reject the requisition.
- `cancel(id)` — cancel the requisition.

### 1.5 Job Mandate

Core recruitment engagement record. A mandate represents an active hiring assignment linked to a client, contract, and optionally a job requisition.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Mandate Number** | text (auto) | Human-readable sequential number (e.g., `MAND-0042`). |
| **Title** | text | Short mandate title. |
| **Client** | text (FK) | Reference to client. |
| **Client Contract** | text (FK, nullable) | Reference to contract governing this mandate. |
| **Job Requisition** | text (FK, nullable) | Link to originating requisition. |
| **Designation** | text | Job title. |
| **Department** | text (nullable) | Target department. |
| **Location** | text (nullable) | Work location. |
| **Employment Type** | enum | `full_time`, `part_time`, `contract`, `internship`, `temporary`. |
| **Job Description** | text (markdown) | Full job description. |
| **Requirements** | text (markdown) | Skills, qualifications, experience required. |
| **Salary Range Min** | numeric (nullable) | Minimum offered salary. |
| **Salary Range Max** | numeric (nullable) | Maximum offered salary. |
| **Number of Positions** | integer | How many people to hire for this mandate. |
| **Priority** | enum | `low`, `medium`, `high`, `critical`. |
| **Status** | enum | `draft`, `open`, `on_hold`, `filled`, `partially_filled`, `cancelled`, `closed`. |
| **Assigned To** | text (FK, nullable) | User (Sourcing Consultant or Team Lead) assigned to the mandate. |
| **Verified** | boolean | Whether the mandate has been verified by QC. |
| **Verified By** | text (FK, nullable) | User who verified the mandate. |
| **Verified At** | timestamptz (nullable) | Verification timestamp. |
| **Deadline** | date (nullable) | Expected fill-by date. |
| **Closed At** | timestamptz (nullable) | When the mandate was closed. |
| **Created By** | text (FK) | User who created the mandate. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new mandate (status: draft).
- `update(id, patch)` — update mandate details.
- `assign(id, userId)` — assign a sourcing consultant or team lead.
- `verify(id, userId)` — mark mandate as verified (QC role).
- `linkProspect(mandateId, prospectId)` — link a prospect to the mandate (see §2.4).
- `open(id)` — move to open status.
- `hold(id, reason)` — put mandate on hold.
- `close(id, reason)` — close the mandate.
- `cancel(id, reason)` — cancel the mandate.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.

**Linked Prospects**: A mandate can have multiple linked prospects (see §2.4). The mandate tracks how many positions have been filled vs. the total requested.

### 1.6 Job Opening (Published)

Public-facing vacancy derived from a Job Mandate. Used for the job portal and external distribution.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Job Mandate** | text (FK) | Source mandate. |
| **Title** | text | Public-facing job title. |
| **Description** | text (markdown) | Public job description. |
| **Requirements** | text (markdown) | Public requirements. |
| **Location** | text (nullable) | Work location. |
| **Employment Type** | enum | `full_time`, `part_time`, `contract`, `internship`, `temporary`. |
| **Salary Range Min** | numeric (nullable) | Public minimum salary. |
| **Salary Range Max** | numeric (nullable) | Public maximum salary. |
| **Application Deadline** | date (nullable) | Last date to apply. |
| **Status** | enum | `draft`, `published`, `closed`, `cancelled`. |
| **Published At** | timestamptz (nullable) | When the opening was published. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `createFromMandate(mandateId)` — create a job opening from an existing mandate.
- `publish(id)` — make the opening visible on the job portal.
- `close(id)` — close the opening to new applications.
- `update(id, patch)` — update public-facing details.

---

## 2. Prospect Management

### 2.1 Prospect

A potential candidate identified through outbound sourcing, referrals, or database mining. Prospects are distinct from applicants — they have not yet applied; they are sourced and engaged by the recruitment team.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Full name. |
| **Email** | text (nullable) | Email address. |
| **Phone** | text (nullable) | Phone number. |
| **Current Company** | text (nullable) | Current employer. |
| **Current Designation** | text (nullable) | Current job title. |
| **Total Experience** | numeric (nullable) | Years of total experience. |
| **Relevant Experience** | numeric (nullable) | Years of relevant experience. |
| **Current Location** | text (nullable) | Current city/region. |
| **Preferred Location** | text (nullable) | Preferred work location. |
| **Expected Salary** | numeric (nullable) | Expected compensation. |
| **Notice Period** | integer (nullable) | Notice period in days. |
| **Skills** | text[] | Array of key skills. |
| **Resume** | text (FK, nullable) | Reference to Storage unit for resume file. |
| **LinkedIn URL** | text (nullable) | LinkedIn profile URL. |
| **Source** | enum | `referral`, `linkedin`, `job_portal`, `database`, `cold_call`, `agency`, `other`. |
| **Source Detail** | text (nullable) | Additional source context (referrer name, agency name, etc.). |
| **Notes** | text (markdown, nullable) | Recruiter notes. |
| **Status** | enum | `new`, `contacted`, `interested`, `not_interested`, `not_reachable`, `screening`, `shortlisted`, `offer_extended`, `offer_accepted`, `offer_rejected`, `joined`, `archived`. |
| **Assigned To** | text (FK, nullable) | User (Sourcing Consultant or Caller) managing this prospect. |
| **Created By** | text (FK) | User who created the record. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new prospect.
- `update(id, patch)` — update prospect details.
- `assign(id, userId)` — assign to a recruiter.
- `updateStatus(id, status)` — change pipeline status.
- `archive(id)` / `restore(id)` — soft-delete lifecycle.
- `bulkImport(prospects[])` — CSV/bulk import of prospects.
- `merge(primaryId, duplicateId)` — merge duplicate prospect records.

### 2.2 Prospect Activity Log

Immutable audit trail of all interactions with a prospect.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Prospect** | text (FK) | Reference to prospect. |
| **User** | text (FK) | Who performed the action. |
| **Action** | enum | `created`, `contacted`, `email_sent`, `called`, `status_changed`, `note_added`, `mandate_linked`, `mandate_unlinked`, `assigned`, `resume_updated`, `archived`. |
| **Details** | text (nullable) | Human-readable description of the action. |
| **Old Value** | jsonb (nullable) | Previous value (for changes). |
| **New Value** | jsonb (nullable) | New value (for changes). |
| **Created At** | timestamptz | When the action occurred. |

- Activity log is append-only — no edits or deletes.
- Displayed as a timeline on the prospect detail view.
- Filterable by action type.

### 2.3 Prospect Pipeline View

Visual representation of prospects across pipeline stages.

- **Board view**: columns mapped to prospect statuses (New → Contacted → Interested → Screening → Shortlisted → Offer Extended → Offer Accepted → Joined).
- **Filters**: by assigned recruiter, source, skills, experience range, mandate.
- **Drag-and-drop**: move prospects between stages to update status.
- **Bulk operations**: change status, assign, archive multiple prospects.

### 2.4 Prospect-Mandate Link

Many-to-many relationship between prospects and job mandates.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Prospect** | text (FK) | Reference to prospect. |
| **Job Mandate** | text (FK) | Reference to job mandate. |
| **Status** | enum | `proposed`, `shortlisted`, `interviewing`, `offered`, `accepted`, `rejected`, `withdrawn`. |
| **Linked By** | text (FK) | User who created the link. |
| **Linked At** | timestamptz | When the link was created. |
| **Notes** | text (nullable) | Link-specific notes. |

- A prospect can be linked to multiple mandates (different roles).
- A mandate can have multiple linked prospects (competing for the same role).
- Link status tracks the prospect's progress within that specific mandate.
- Mandate fill count is computed from links with status `accepted`.

### 2.5 Draft

Working document or notes associated with a prospect or mandate.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Title** | text | Draft title. |
| **Content** | text (markdown) | Draft content. |
| **Prospect** | text (FK, nullable) | Linked prospect (optional). |
| **Job Mandate** | text (FK, nullable) | Linked mandate (optional). |
| **Created By** | text (FK) | User who created the draft. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

---

## 3. Applicant Management

### 3.1 Job Application

Record of a candidate who has applied for a published Job Opening. Applicants are inbound — they apply through the job portal, referral, or direct submission.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Application Number** | text (auto) | Human-readable sequential number (e.g., `APP-01234`). |
| **Job Opening** | text (FK) | Reference to the opening applied for. |
| **Job Mandate** | text (FK) | Derived from the job opening's mandate. |
| **Name** | text | Applicant's full name. |
| **Email** | text | Email address. |
| **Phone** | text (nullable) | Phone number. |
| **Resume** | text (FK) | Reference to Storage unit for resume file. |
| **Cover Letter** | text (markdown, nullable) | Cover letter content. |
| **Current Company** | text (nullable) | Current employer. |
| **Current Designation** | text (nullable) | Current job title. |
| **Total Experience** | numeric (nullable) | Years of total experience. |
| **Relevant Experience** | numeric (nullable) | Years of relevant experience. |
| **Current Location** | text (nullable) | Current city/region. |
| **Expected Salary** | numeric (nullable) | Expected compensation. |
| **Notice Period** | integer (nullable) | Notice period in days. |
| **Source** | enum | `portal`, `referral`, `linkedin`, `agency`, `direct`, `other`. |
| **Source Detail** | text (nullable) | Additional source context. |
| **Status** | enum | `new`, `screening`, `shortlisted`, `interviewing`, `offered`, `accepted`, `rejected`, `withdrawn`, `on_hold`. |
| **Rejection Reason** | text (nullable) | Reason if rejected. |
| **Screened By** | text (FK, nullable) | User who performed initial screening. |
| **Screened At** | timestamptz (nullable) | When screening occurred. |
| **Notes** | text (markdown, nullable) | Recruiter notes. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a new application (manual entry or portal submission).
- `update(id, patch)` — update application details.
- `screen(id, userId)` — mark as screened with notes.
- `shortlist(id)` — move to shortlisted status.
- `reject(id, reason)` — reject the application.
- `hold(id, reason)` — put application on hold.
- `withdraw(id)` — applicant withdraws.
- `convertToCandidate(id)` — convert a shortlisted applicant to a Candidate (see §4.1).
- `mergeWithProspect(applicantId, prospectId)` — link an applicant to an existing prospect record.

### 3.2 Resume Parsing

Automated extraction of structured data from uploaded resumes.

- **Supported formats**: PDF, DOCX, plain text.
- **Extracted fields**: name, email, phone, skills, work experience (company, title, duration), education, certifications.
- **Confidence scoring**: each extracted field has a confidence score.
- **Manual override**: parsed data is pre-filled but editable by the recruiter.
- **Storage**: original resume stored via Storage unit; parsed data stored as structured fields on the application.

### 3.3 Screening Questionnaire

Configurable questions for initial applicant screening.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | Questionnaire name. |
| **Job Opening** | text (FK, nullable) | Linked to a specific opening, or null for reusable templates. |
| **Questions** | jsonb | Array of questions with type, options, and correct answers (if applicable). |
| **Is Active** | boolean | Whether the questionnaire is in use. |
| **Created At** | timestamptz | Record creation timestamp. |

**Question types**: `text`, `multiple_choice`, `single_choice`, `yes_no`, `numeric`, `date`.

- Applicants can be required to complete the questionnaire during application.
- Responses stored per application; scored automatically where applicable.

### 3.4 Applicant Pipeline View

Visual representation of applicants across pipeline stages.

- **Board view**: columns mapped to applicant statuses (New → Screening → Shortlisted → Interviewing → Offered → Accepted → Rejected).
- **Filters**: by job opening, mandate, source, experience range, screening status.
- **Drag-and-drop**: move applicants between stages.
- **Bulk operations**: reject, shortlist, assign multiple applicants.

---

## 4. Candidate Management

### 4.1 Candidate

A shortlisted applicant or prospect who has entered the active evaluation pipeline. Candidates undergo interviews, evaluations, and may receive offers.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Candidate Number** | text (auto) | Human-readable sequential number (e.g., `CAND-0056`). |
| **Source Type** | enum | `applicant`, `prospect`. |
| **Source Applicant** | text (FK, nullable) | Reference to originating Job Application (if from applicant pipeline). |
| **Source Prospect** | text (FK, nullable) | Reference to originating Prospect (if from prospect pipeline). |
| **Source Prospect-Mandate Link** | text (FK, nullable) | Reference to the specific mandate link. |
| **Job Mandate** | text (FK) | The mandate this candidate is being evaluated for. |
| **Name** | text | Candidate name. |
| **Email** | text | Email address. |
| **Phone** | text (nullable) | Phone number. |
| **Resume** | text (FK) | Reference to Storage unit for resume file. |
| **Current Company** | text (nullable) | Current employer. |
| **Current Designation** | text (nullable) | Current job title. |
| **Total Experience** | numeric (nullable) | Years of total experience. |
| **Expected Salary** | numeric (nullable) | Expected compensation. |
| **Status** | enum | `screening`, `interview_scheduled`, `interviewing`, `evaluation`, `shortlisted`, `offered`, `offer_accepted`, `offer_rejected`, `onboarded`, `rejected`, `withdrawn`. |
| **Rejection Reason** | text (nullable) | Reason if rejected. |
| **Overall Rating** | numeric (nullable) | Aggregated score from interview feedback (0-5). |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `createFromApplicant(applicantId, mandateId)` — create from a shortlisted applicant.
- `createFromProspect(prospectId, mandateId)` — create from a linked prospect.
- `update(id, patch)` — update candidate details.
- `updateStatus(id, status)` — change pipeline status.
- `reject(id, reason)` — reject the candidate.
- `withdraw(id)` — candidate withdraws.

**Conversion flow**: When a candidate is created, the source applicant or prospect-mandate link status is updated to `interviewing` to reflect the progression.

### 4.2 Interview Type

Define categories of interviews.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | e.g., Phone Screen, Technical, HR, Cultural Fit, Case Study, Panel. |
| **Description** | text (nullable) | What this interview type covers. |
| **Duration** | integer (nullable) | Default duration in minutes. |
| **Is Active** | boolean | Whether this type is available for scheduling. |

### 4.3 Interview Round

Define sequential rounds in the hiring process for a mandate.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Job Mandate** | text (FK) | The mandate this round belongs to. |
| **Round Number** | integer | Sequence number (1, 2, 3...). |
| **Name** | text | Round name (e.g., "Phone Screen", "Technical Round 1", "Final HR"). |
| **Interview Type** | text (FK) | Reference to interview type. |
| **Evaluation Criteria** | text (markdown, nullable) | What to evaluate in this round. |
| **Is Elimination Round** | boolean | Whether failing this round eliminates the candidate. |

- Rounds are ordered; candidates progress through rounds sequentially.
- Each mandate can define its own set of interview rounds.

### 4.4 Interview

Scheduled interview session for a candidate.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Candidate** | text (FK) | Reference to candidate. |
| **Job Mandate** | text (FK) | Reference to mandate. |
| **Interview Round** | text (FK) | Which round this interview is for. |
| **Scheduled Date** | date | Interview date. |
| **Start Time** | timestamptz | Interview start time. |
| **End Time** | timestamptz | Interview end time. |
| **Location** | text (nullable) | Physical location or meeting room. |
| **Meeting Link** | text (nullable) | Video call URL. |
| **Interviewers** | text[] | Array of user IDs conducting the interview. |
| **Status** | enum | `scheduled`, `in_progress`, `completed`, `cancelled`, `no_show`. |
| **Feedback Submitted** | boolean | Whether all interviewers have submitted feedback. |
| **Average Rating** | numeric (nullable) | Computed from feedback ratings. |
| **Result** | enum (nullable) | `strong_hire`, `hire`, `no_hire`, `strong_no_hire`. |
| **Notes** | text (nullable) | Additional notes. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — schedule a new interview.
- `update(id, patch)` — reschedule or update details.
- `cancel(id, reason)` — cancel the interview.
- `markComplete(id)` — mark interview as completed.
- `markNoShow(id)` — candidate did not attend.

**Scheduling**:
- Calendar view for interviewer availability and scheduling.
- Conflict detection: warns if interviewer has overlapping interviews.
- Bulk scheduling: schedule multiple candidates for the same round.

### 4.5 Interview Feedback

Interviewer's evaluation of a candidate after an interview.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Interview** | text (FK) | Reference to interview. |
| **Candidate** | text (FK) | Reference to candidate. |
| **Interviewer** | text (FK) | User who is providing feedback. |
| **Rating** | numeric | Overall rating (1-5). |
| **Strengths** | text (nullable) | Candidate's strengths observed. |
| **Weaknesses** | text (nullable) | Areas of concern. |
| **Comments** | text (markdown, nullable) | Detailed feedback. |
| **Recommendation** | enum | `strong_hire`, `hire`, `no_hire`, `strong_no_hire`. |
| **Criteria Scores** | jsonb (nullable) | Per-criteria ratings if evaluation criteria defined on the round. |
| **Submitted At** | timestamptz | When feedback was submitted. |

- Aggregated feedback visible on the Interview record.
- Candidate's `Overall Rating` is computed from all interview feedback averages.
- Permission-sensitive: interviewers see only their own feedback until all feedback is submitted (configurable).

### 4.6 Candidate Evaluation Summary

Consolidated view of a candidate's evaluation across all interview rounds.

- **Per-round summary**: round name, interview date, interviewers, average rating, recommendation.
- **Overall score**: weighted average across all rounds.
- **Comparison view**: side-by-side comparison of multiple candidates for the same mandate.
- **Recommendation aggregation**: tally of hire/no-hire recommendations across interviewers.

### 4.7 Job Offer

Formal offer extended to a candidate.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Candidate** | text (FK) | Reference to candidate. |
| **Job Mandate** | text (FK) | Reference to mandate. |
| **Designation** | text | Offered job title. |
| **Department** | text (nullable) | Department. |
| **Location** | text (nullable) | Work location. |
| **Employment Type** | enum | `full_time`, `part_time`, `contract`, `internship`, `temporary`. |
| **Offered Salary** | numeric | Annual CTC or hourly rate. |
| **Salary Breakdown** | jsonb (nullable) | Component-wise breakdown (basic, HRA, allowances, etc.). |
| **Benefits** | text (markdown, nullable) | Benefits description. |
| **Joining Date** | date | Expected joining date. |
| **Offer Date** | date | When the offer was extended. |
| **Valid Until** | date | Offer expiry date. |
| **Status** | enum | `draft`, `sent`, `awaiting_response`, `accepted`, `rejected`, `withdrawn`, `expired`. |
| **Rejection Reason** | text (nullable) | Reason if rejected. |
| **Accepted At** | timestamptz (nullable) | When the offer was accepted. |
| **Document** | text (FK, nullable) | Reference to Storage unit for offer letter PDF. |
| **Created By** | text (FK) | User who created the offer. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

**Operations**:
- `create(input)` — create a draft offer.
- `send(id)` — send the offer to the candidate.
- `accept(id)` — mark offer as accepted.
- `reject(id, reason)` — mark offer as rejected.
- `withdraw(id)` — withdraw the offer.
- `generateDocument(id)` — generate offer letter PDF from template.

### 4.8 Appointment Letter

Formal document generated from an accepted Job Offer.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Job Offer** | text (FK) | Reference to the accepted offer. |
| **Candidate** | text (FK) | Reference to candidate. |
| **Template** | text (FK, nullable) | Reference to document template used. |
| **Content** | text | Rendered letter content. |
| **Document** | text (FK, nullable) | Reference to Storage unit for generated PDF. |
| **Status** | enum | `draft`, `generated`, `sent`, `signed`. |
| **Generated At** | timestamptz (nullable) | When the letter was generated. |
| **Sent At** | timestamptz (nullable) | When the letter was sent. |
| **Signed At** | timestamptz (nullable) | When the letter was signed. |
| **Created At** | timestamptz | Record creation timestamp. |

**Template system**:
- Configurable templates with merge fields: `{{candidate_name}}`, `{{designation}}`, `{{salary}}`, `{{joining_date}}`, `{{company_name}}`, etc.
- Multiple templates per letter type (offer letter, appointment letter, internship letter, etc.).
- Printable/downloadable PDF generation.

### 4.9 Employee Referral

Track employee referrals for job openings.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Referrer** | text (FK) | Employee who made the referral (references HR Employee master). |
| **Job Mandate** | text (FK) | Mandate being referred for. |
| **Prospect** | text (FK, nullable) | Link to created prospect (if referred as prospect). |
| **Applicant** | text (FK, nullable) | Link to created application (if referred as applicant). |
| **Candidate Name** | text | Name of the referred person. |
| **Candidate Email** | text (nullable) | Email of the referred person. |
| **Candidate Phone** | text (nullable) | Phone of the referred person. |
| **Resume** | text (FK, nullable) | Reference to Storage unit for resume. |
| **Status** | enum | `submitted`, `reviewed`, `shortlisted`, `interviewing`, `offered`, `joined`, `rejected`. |
| **Referral Bonus** | numeric (nullable) | Bonus amount payable to the referrer on successful hire. |
| **Bonus Paid** | boolean | Whether the referral bonus has been disbursed. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

---

## 5. Supporting Features

### 5.1 Filter View

Reusable filter and display configurations for recruitment lists.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Name** | text | View name (e.g., "My Prospects", "Open Mandates This Week"). |
| **Owner** | text (FK) | User who created the view. |
| **Entity** | enum | `prospect`, `applicant`, `candidate`, `job_mandate`, `client`. |
| **Type** | enum | `list`, `board`, `calendar`. |
| **Filters** | jsonb | Serialized filter criteria. |
| **Sort** | jsonb | Serialized sort configuration. |
| **Group By** | text (nullable) | Field to group results by. |
| **Is Shared** | boolean | Visible to other team members. |
| **Is Default** | boolean | Auto-loaded when entering the entity list. |

### 5.2 Reminder

Scheduled notifications for recruitment-related events.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **User** | text (FK) | Who receives the reminder. |
| **Type** | enum | `follow_up`, `interview`, `deadline`, `custom`. |
| **Entity Type** | enum | `prospect`, `applicant`, `candidate`, `job_mandate`. |
| **Entity ID** | text | Reference to the related entity. |
| **Remind At** | timestamptz | When to fire the reminder. |
| **Message** | text (nullable) | Custom reminder text. |
| **Is Sent** | boolean | Whether the reminder has been delivered. |
| **Created At** | timestamptz | Record creation timestamp. |

**Reminder types**:
- **Follow-up**: reminder to follow up with a prospect or applicant.
- **Interview**: reminder about an upcoming interview.
- **Deadline**: reminder about a mandate deadline or offer validity.
- **Custom**: user-defined reminder.

**Delivery**: via PubSub unit → notification channel (in-app, email, push — depends on notification unit).

### 5.3 Task

Recruitment-specific task management for team coordination.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **Title** | text | Task title. |
| **Description** | text (markdown, nullable) | Task details. |
| **Assigned To** | text (FK) | User responsible for the task. |
| **Assigned By** | text (FK) | User who assigned the task. |
| **Priority** | enum | `low`, `medium`, `high`, `urgent`. |
| **Status** | enum | `todo`, `in_progress`, `done`, `cancelled`. |
| **Due Date** | date (nullable) | Task deadline. |
| **Entity Type** | enum (nullable) | `prospect`, `applicant`, `candidate`, `job_mandate`, `client`. |
| **Entity ID** | text (nullable) | Reference to the related entity. |
| **Completed At** | timestamptz (nullable) | When the task was completed. |
| **Created At** | timestamptz | Record creation timestamp. |
| **Updated At** | timestamptz | Last modification timestamp. |

### 5.4 Notification

In-app notification system for recruitment events.

| Field | Type | Description |
|---|---|---|
| **ID** | text (auto) | System-generated unique identifier. |
| **User** | text (FK) | Recipient. |
| **Type** | text | Notification type (e.g., `mandate_assigned`, `applicant_new`, `interview_scheduled`, `offer_accepted`). |
| **Title** | text | Notification title. |
| **Message** | text | Notification body. |
| **Entity Type** | enum (nullable) | `prospect`, `applicant`, `candidate`, `job_mandate`, `client`. |
| **Entity ID** | text (nullable) | Reference to the related entity. |
| **Is Read** | boolean | Whether the user has read the notification. |
| **Read At** | timestamptz (nullable) | When the notification was read. |
| **Created At** | timestamptz | Record creation timestamp. |

**Events that trigger notifications**:
- Mandate assigned to a user.
- New applicant for a mandate.
- Interview scheduled or cancelled.
- Feedback submitted.
- Offer accepted or rejected.
- Prospect status changed.
- Reminder fired.
- Task assigned.

---

## 6. Data Model Summary

| Domain | Key Tables |
|---|---|
| **Clients** | Client, Client Contract |
| **Mandates** | Staffing Plan, Job Requisition, Job Mandate, Job Opening |
| **Prospects** | Prospect, Prospect Activity Log, Prospect-Mandate Link, Draft |
| **Applicants** | Job Application, Screening Questionnaire |
| **Candidates** | Candidate, Interview Type, Interview Round, Interview, Interview Feedback, Job Offer, Appointment Letter, Employee Referral |
| **Supporting** | Filter View, Reminder, Task, Notification |

---

## 7. Dependencies & Prerequisites

| Dependency | Reason |
|---|---|
| **Auth Unit** | User identity, roles, access control for the 7 recruitment roles and 12 permission resources. |
| **Storage Unit** | Resume uploads, offer letters, appointment letters, contract documents. |
| **PubSub Unit** | Notification delivery, reminder scheduling, activity event publishing. |
| **RPC Unit** | API exposure for client applications. |
| **HR Module** (optional) | Employee master for referral tracking (referrer lookup), organizational structure (department, designation), onboarding handoff. |
| **Notification Unit** (optional) | Multi-channel notification delivery (email, push) beyond in-app. |

**Without HR Module**: The recruitment module can operate independently. Employee referrals fall back to user lookup from the Auth unit. Department and designation fields are free-text rather than FK references to HR masters. Candidate-to-employee onboarding is a manual process.

---

## 8. Cross-Module Integrations

### 8.1 HR Module Integration

| Integration | Flow |
|---|---|
| **Employee → Referrer** | Employee Referral references HR Employee master for the referrer. |
| **Department / Designation → Mandate** | Job Mandate can reference HR department and designation masters for organizational alignment. |
| **Employee Onboarding ← Candidate** | Accepted Job Offer can trigger Employee Onboarding workflow in the HR module (from HR Phase 1 §6.1). |
| **Salary Structure → Offer** | Job Offer salary breakdown can reference HR salary components and structures (from HR Phase 2 §3.1). |
| **Holiday List → Scheduling** | Interview scheduling can skip holidays from the HR Holiday List. |

### 8.2 Auth Unit Integration

| Integration | Flow |
|---|---|
| **User → Team Member** | Recruitment team members are Auth users with specific roles (Admin, BD, Caller, QC, RM, SC, TL). |
| **Roles → Permissions** | All 12 recruitment resources are enforced via Auth's access control system. |
| **Session → Audit** | Activity log entries include the authenticated user from the current session. |

### 8.3 Storage Unit Integration

| Integration | Flow |
|---|---|
| **Resume Upload → Prospect / Applicant / Candidate** | Resume files stored via Storage unit, referenced by FK on multiple entities. |
| **Offer Letter → Storage** | Generated offer/appointment letter PDFs stored via Storage unit. |
| **Contract Document → Storage** | Client contract documents stored via Storage unit. |

### 8.4 PubSub Unit Integration

| Integration | Flow |
|---|---|
| **Notification → PubSub** | Recruitment events publish to PubSub for notification delivery. |
| **Reminder → PubSub** | Scheduled reminders publish to PubSub for delivery. |
| **Activity Log → PubSub** | Entity changes publish events for real-time UI updates. |

### 8.5 RPC Unit Integration

| Integration | Flow |
|---|---|
| **API Exposure** | All recruitment operations exposed as oRPC procedures for client consumption. |
| **Client Framework** | Recruitment queries and mutations available via the client-side RPC unit. |

---

## 9. RBAC Model

The module enforces the existing 7-role, 12-resource RBAC model defined in the recruiter app.

### Roles

| Role | Abbreviation | Focus |
|---|---|---|
| **Admin** | `admin` | Full access to all resources and actions. |
| **Business Development** | `bd` | Client acquisition, contract management, mandate creation and assignment. |
| **Caller** | `caller` | Outbound prospecting, initial contact, draft management. |
| **Quality Control** | `qc` | Mandate verification, prospect review, quality assurance. |
| **Relationship Manager** | `rm` | Client relationship management, prospect engagement. |
| **Sourcing Consultant** | `sc` | Candidate sourcing, prospect-to-mandate linking, pipeline management. |
| **Team Lead** | `tl` | Team coordination, task assignment, mandate oversight. |

### Resource Permissions

| Resource | Admin | BD | Caller | QC | RM | SC | TL |
|---|---|---|---|---|---|---|---|
| **clients** | CRUD | CRUD | — | — | R | — | — |
| **client_contracts** | CRUD | CRUD | — | — | R | — | — |
| **job_mandates** | CRUD + assign + verify + link | CRUD + assign | R | R + verify | R + assign | R + link | R + assign + link |
| **prospects** | CRUD | CR | CRU | R | CR | CRUD + archive | CR |
| **applicants** | CRUD | R | — | R | R | R | R |
| **candidates** | CRUD | R | — | R | R | R | R |
| **drafts** | CRUD | — | CRUD | CRUD | CRUD | CRUD | CRUD |
| **filter_views** | CRUD | — | CRUD | CRUD | CRUD | CRUD | CRUD |
| **reminders** | CRA | — | CRA | CRA | CRA | CRA | CRA |
| **tasks** | CRUD + assign | — | — | — | — | — | CRUD + assign |
| **team_members** | CRUD + manage-roles | — | — | — | — | — | — |
| **notification** | RA | RA | RA | RA | RA | RA | RA |

---

## 10. Out of Scope

- **Job Portal**: public-facing careers page for external applicants (future phase).
- **Resume Parsing**: automated extraction of structured data from resumes (future phase — requires ML/NLP integration).
- **Email Integration**: inbound/outbound email tracking, email templates, bulk emailing.
- **Analytics & Reporting**: recruitment funnel analytics, time-to-hire metrics, source effectiveness (future module).
- **AI/ML features**: smart candidate matching, duplicate detection, predictive hiring.
- **Video Interview Integration**: third-party video conferencing (Zoom, Teams, Google Meet).
- **Background Verification**: third-party BGV integration.
- **Multi-language support**: i18n of UI labels.
- **Mobile-native app**: responsive web only.
- **Payroll integration**: offer salary to payroll handoff (handled by HR module).

---

## 11. Implementation Notes

### Module Structure

```
packages/recruitment/
├── index.ts                 # Module entry — implements Module interface
├── types.ts                 # Recruitment module types
├── db-schema.ts             # Drizzle table definitions
├── workflows/
│   ├── client.ts            # Client & contract CRUD
│   ├── mandate.ts           # Job mandate lifecycle
│   ├── prospect.ts          # Prospect CRUD & pipeline
│   ├── applicant.ts         # Application management
│   ├── candidate.ts         # Candidate lifecycle
│   ├── interview.ts         # Interview scheduling & feedback
│   ├── offer.ts             # Offer & appointment letter
│   ├── referral.ts          # Employee referral management
│   └── supporting.ts        # Filter views, reminders, tasks, notifications
├── services/
│   ├── pipeline-service.ts  # Pipeline view queries & status transitions
│   ├── mandate-service.ts   # Mandate business logic (fill tracking, verification)
│   ├── screening-service.ts # Screening questionnaire scoring
│   ├── notification-bridge.ts # PubSub integration for notifications/reminders
│   └── import-service.ts    # CSV/bulk import for prospects
└── event-map.ts             # Recruitment domain events
```

### Domain Events

| Event | Payload | Trigger |
|---|---|---|
| `client:created` | `{ client }` | Client created. |
| `client:updated` | `{ client, changes }` | Client details modified. |
| `mandate:created` | `{ mandate }` | Job mandate created. |
| `mandate:assigned` | `{ mandateId, userId }` | Mandate assigned to a recruiter. |
| `mandate:verified` | `{ mandateId, userId }` | Mandate verified by QC. |
| `mandate:opened` | `{ mandate }` | Mandate status changed to open. |
| `mandate:closed` | `{ mandate, reason }` | Mandate closed. |
| `mandate:prospect_linked` | `{ mandateId, prospectId, linkId }` | Prospect linked to mandate. |
| `mandate:prospect_unlinked` | `{ mandateId, prospectId }` | Prospect unlinked from mandate. |
| `prospect:created` | `{ prospect }` | Prospect created. |
| `prospect:status_changed` | `{ prospect, fromStatus, toStatus }` | Prospect pipeline stage change. |
| `prospect:assigned` | `{ prospectId, userId }` | Prospect assigned to a recruiter. |
| `applicant:created` | `{ applicant }` | New job application received. |
| `applicant:screened` | `{ applicantId, userId }` | Application screened. |
| `applicant:shortlisted` | `{ applicant }` | Application shortlisted. |
| `applicant:rejected` | `{ applicant, reason }` | Application rejected. |
| `candidate:created` | `{ candidate }` | Candidate created from applicant or prospect. |
| `candidate:status_changed` | `{ candidate, fromStatus, toStatus }` | Candidate pipeline stage change. |
| `interview:scheduled` | `{ interview }` | Interview scheduled. |
| `interview:completed` | `{ interview }` | Interview marked as completed. |
| `interview:feedback_submitted` | `{ interview, feedback }` | Interviewer submitted feedback. |
| `offer:created` | `{ offer }` | Job offer created. |
| `offer:sent` | `{ offer }` | Offer sent to candidate. |
| `offer:accepted` | `{ offer }` | Offer accepted. |
| `offer:rejected` | `{ offer, reason }` | Offer rejected. |
| `referral:created` | `{ referral }` | Employee referral submitted. |
| `reminder:fired` | `{ reminder }` | Reminder triggered. |
| `task:assigned` | `{ taskId, userId }` | Task assigned to a user. |

### Phase Sequencing

**Phase 1 — Core Pipeline**:
- Client and Client Contract CRUD.
- Job Mandate CRUD with assignment and verification.
- Prospect CRUD with status pipeline and activity logging.
- Prospect-Mandate linking.
- Job Application CRUD with status pipeline.
- Filter Views for prospects and mandates.
- RBAC enforcement for all 12 resources.

**Phase 2 — Candidate Evaluation**:
- Candidate creation from applicants and prospects.
- Interview Type and Interview Round configuration.
- Interview scheduling with conflict detection.
- Interview Feedback submission and aggregation.
- Candidate Evaluation Summary.
- Notification system (in-app).

**Phase 3 — Offers & Closure**:
- Job Offer lifecycle (draft → sent → accepted/rejected).
- Appointment Letter generation from templates.
- Employee Referral tracking.
- Reminders and Tasks.
- Candidate-to-employee onboarding handoff (HR integration).

**Phase 4 — Advanced**:
- Staffing Plan and Job Requisition workflows.
- Job Opening (published) management.
- Screening Questionnaire with scoring.
- CSV/bulk import for prospects.
- Pipeline board views with drag-and-drop.
- Activity log filtering and search.

### Estimated Effort (Relative)

| Area | Complexity | Notes |
|---|---|---|
| Client & Contract CRUD | Low | Standard CRUD with document storage. |
| Job Mandate Lifecycle | Medium | Multi-status workflow, verification, assignment, fill tracking. |
| Prospect Pipeline | Medium | Status transitions, activity logging, bulk import, merge. |
| Prospect-Mandate Linking | Low | Join table with status tracking. |
| Applicant Management | Medium | Application intake, screening, shortlisting, conversion to candidate. |
| Candidate Lifecycle | Medium | Dual-source creation (applicant/prospect), status management. |
| Interview Scheduling | High | Calendar integration, conflict detection, multi-interviewer coordination. |
| Interview Feedback | Medium | Multi-dimensional scoring, aggregation, permission-sensitive visibility. |
| Offer Management | Medium | Draft/sent/accepted lifecycle, document generation, template system. |
| Notifications | Medium | PubSub integration, in-app delivery, event-driven triggers. |
| RBAC Enforcement | Low | Leverages existing Auth unit access control. |
| Pipeline Board Views | Medium | Board/list views with filters, drag-and-drop. |

### Testing Focus Areas

- **Mandate lifecycle**: status transitions, verification workflow, fill count tracking from prospect-mandate links.
- **Prospect-mandate linking**: many-to-many integrity, status propagation, fill count computation.
- **Dual-source candidate creation**: conversion from applicant vs. prospect, source record status updates.
- **Interview scheduling**: conflict detection correctness, multi-interviewer availability, round sequencing.
- **Feedback aggregation**: average rating computation, recommendation tallying, permission-sensitive visibility.
- **Offer lifecycle**: status transitions, accepted offer triggering onboarding (HR integration).
- **RBAC**: permission enforcement per role across all 12 resources, `link_prospect` and `verify` action restrictions.
- **Activity log**: immutable audit trail completeness, correct old/new value capture.
