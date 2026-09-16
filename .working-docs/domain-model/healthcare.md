# Healthcare Domain Model

> Package: `@aspen-os/healthcare`. OPD clinic backend — registration, EMR across five specialties (allopathy, dental, ayush, rehab, psych), pharmacy, diagnostics, billing, nursing, records. No ADT/IPD bed management, no OT scheduling, no insurance/TPA. 135 tables, all tenant schemas (`healthcare_` prefix) + 13 `healthcare_*` pgEnums. Staff, roster, attendance, leave, and payroll live in HR (`hrCore`, `hr-attendance`, `hr-leave`). Stateless: `$initialize`/`$prepareRuntime`/`$cleanup` empty; no schedules, no subscriptions.

## Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             HEALTHCARE DOMAIN                                │
│  All tables tenant schemas, `healthcare_` prefix, `id: uuidv7().primaryKey()` │
│  All timestamps `timestamptz`; API boundary `camelCase` → DB `snake_case`     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Patient    │  │ Practitioner │  │   Facility   │  │     Service      │   │
│  │   9 tables   │  │   7 tables   │  │   3 tables   │  │ 4 tables +       │   │
│  │ patient +    │  │ practitioner │  │ facility +   │  │ pricelists       │   │
│  │ family/allergy│  │ reg/edu/     │  │ block +      │  │ 6 tables         │   │
│  │ consent/flag/ │  │ posting/     │  │ steril-log   │  │ service/price/   │   │
│  │ merge/recall/ │  │ schedule/fee/│  └──────────────┘  │ discount/package │   │
│  │ comm/share    │  │ leave-block  │  ┌──────────────┐  │ + branch/pricelist│   │
│  └──────────────┘  └──────────────┘  │  Healthcare  │  └──────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  │  Branch      │  ┌──────────────────┐   │
│  │ Appointment  │  │  Encounter   │  │ 1 table      │  │      Admin       │   │
│  │ 4 tables     │  │ 7 tables     │  │ subdomain    │  │ 5 tables         │   │
│  │ appt/queue/  │  │ encounter +  │  │ UNIQUE,      │  │ company/role/    │   │
│  │ video/cert   │  │ dx/rx/vitals/│  │ branch_id    │  │ master-ver/      │   │
│  │              │  │ order/follow/│  │ default main │  │ template/recall  │   │
│  └──────────────┘  │ addendum     │  └──────────────┘  └──────────────────┘   │
│  ┌──────────────┐  └──────────────┘  ┌──────────────┐  ┌──────────────────┐   │
│  │  Allopathy   │  ┌──────────────┐  │    Dental    │  │      Ayush       │   │
│  │  7 tables    │  │    Rehab     │  │  7 tables    │  │  7 tables        │   │
│  │ soap/exam/   │  │  7 tables    │  │ chart/plan/  │  │ casesheet/diet/  │   │
│  │ problem/chron│  │ episode/     │  │ stage/quote/ │  │ repertorize/     │   │
│  │ immunize/reg/│  │ assess/goal/ │  │ consent/chair│  │ package/sitting/ │   │
│  │ triage       │  │ sitting/sheet│  │ lab-job      │  │ yoga batch/enrol │   │
│  └──────────────┘  │ outcome/     │  └──────────────┘  └──────────────────┘   │
│  ┌──────────────┐  │ discharge    │  ┌──────────────┐  ┌──────────────────┐   │
│  │    Psych     │  └──────────────┘  │  Residents   │  │    Pharmacy      │   │
│  │  10 tables   │  ┌──────────────┐  │  8 tables    │  │  8 tables        │   │
│  │ assess/scale/│  │ Diagnostics  │  │ resident/bed/│  │ item/batch/sale/ │   │
│  │ risk/safety/ │  │ 8 tables     │  │ geriatric/   │  │ return/PO/GRN/   │   │
│  │ counsel/addic│  │ test/panel/  │  │ polypharm/   │  │ invoice/transfer │   │
│  │ relapse/ctrl-│  │ order/sample/│  │ daily/round/ │  └──────────────────┘   │
│  │ rx/sidefx/   │  │ result/radio │  │ visit/charge │  ┌──────────────────┐   │
│  │ consent      │  │ book/report/ │  └──────────────┘  │     Billing      │   │
│  └──────────────┘  │ qc           │  ┌──────────────┐  │  6 tables        │   │
│  ┌──────────────┐  └──────────────┘  │   Nursing    │  │ invoice/receipt/ │   │
│  │   Records    │  ┌──────────────┐  │  12 tables   │  │ advance/package/ │   │
│  │  9 tables    │  │ Operations   │  │ task/note/   │  │ cndn/pricelist   │   │
│  │ doc/share/   │  │ 5 tables     │  │ vitals/io/   │  └──────────────────┘   │
│  │ register/    │  │ report-def/  │  │ pain/risk/   │  ┌──────────────────┐   │
│  │ addendum/    │  │ evidence/    │  │ drug/escal/  │  │    Counter       │   │
│  │ merge/msg/   │  │ master/seed/ │  │ daycare/check│  │ 1 table          │   │
│  │ consent/optout│  │ grant        │  │ handover/tag │  │ gapless nums     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Counts sum to 137 `pgTable` + 13 pgEnums (`healthcare_appointment_status`, `healthcare_queue_token_status`, `healthcare_encounter_status`, `healthcare_invoice_status`, `healthcare_lab_order_status`, `healthcare_radio_order_status`, `healthcare_task_status`, `healthcare_sitting_status`, `healthcare_resident_status`, `healthcare_sale_status`, `healthcare_po_status`, `healthcare_grn_status`, `healthcare_batch_status`).

## Aggregates

One shape for all groups: Valibot `{ input }` wrapper with `branchId` (defaults `"main"`); every mutation writes an audit entry + publishes its `healthcare.*` event; reads publish nothing. Soft FKs only (no DB constraints). Gapless numbers via `healthcare_counter`.

### Patients (Aggregate Root)

**Identity**: `healthcare_patient.id`. **Kin**: `family_link`, `allergy`, `consent`, `flag`, `merge_request`, `communication`, `recall`, `share_slip`.

**Invariants**: phone/ABHA dedupe on `register`; two-party merge (`requestMerge` then `approveMerge`); `branchId` defaults `"main"`.

**Lifecycle commands**: `register`, `dedupeCheck`, `get`, `list`, `timeline`, `linkFamily`, `setFlag`, `addAllergy`, `archiveConsent`, `logCommunication`, `shareSlip`, `enrolRecall`, `requestMerge`, `approveMerge` (14 methods).

### Practitioners (Aggregate Root)

Doctor masters: `practitioner` + `registration`/`education`/`posting`/`schedule`/`fee`/`leave_block`.

**Invariants**: `conflict` reports leave vs booked-appointment overlap; `nextFreeSlot` scans schedules minus booked slots over 14 days.

**Lifecycle commands**: `create`, `get`, `list`, `update`, `deactivate`, `addRegistration`, `addEducation`, `addPosting`, `setSchedule`, `setFee`, `blockLeave`, `conflict`, `nextFreeSlot` (13 methods).

### Facilities (Aggregate Root)

Rooms/chairs/equipment: `facility` + `facility_block` + `sterilization_log`.

**Invariants**: single-occupancy `occupy`/`release`; weekly schedules + blocks with `overlap` check.

**Lifecycle commands**: `create`, `get`, `list`, `update`, `setSchedule`, `addBlock`, `overlap`, `occupy`, `release`, `logSterilization`, `statusBoard` (11 methods).

### Services + Pricelists (Aggregate Roots)

`service`/`service_price`/`discount_rule`/`package_def` + `healthcare_branch` (subdomain UNIQUE routing row with `pricelist_ids`) + `healthcare_pricelist`.

**Invariants**: `healthcare_branch.subdomain` unique; `branch_id` defaults `"main"`; pricelist resolution per branch.

**Lifecycle commands**: services (11), pricelists (10: `create`, `get`, `list`, `update`, `publish`, `bulkRevision`, `resolvePrice`, + shared helpers).

### Appointments (Aggregate Root)

`appointment` + `queue_token`/`video_session`/`certificate`.

**Invariants**: slot computation minus booked; queue `callNext`/`checkin`; `reschedule` requires reason.

**Lifecycle commands**: 14 methods (`book`, `bookVideo`, `callNext`, `cancel`, `captureConsent`, `checkin`, `computeSlots`, `get`, `issueCertificate`, `issueRecall`, `list`, `queueBoard`, `reschedule`, `walkinToken`).

### Encounters (Aggregate Root)

`encounter` + `diagnosis`/`prescription`/`vitals`/`clinic_order`/`follow_up`/`addendum`.

**Invariants**: `sign` closes encounter; prescriptions refillable; vitals charted per encounter.

**Lifecycle commands**: 10 methods (`create`, `get`, `addDiagnosis`, `addendum`, `placeOrder`, `prescribe`, `recordVitals`, `refill`, `setFollowUp`, `sign`).

### EMR specialties (Aggregate Roots)

- **Allopathy** (7 tables: `soap_note`, `exam_finding`, `problem`, `chronic_log`, `immunization`, `register_entry`, `triage_entry`; 10 methods incl. `problemUpsert`, `interactionCheck`, `triageEntry`).
- **Dental** (7 tables: `dental_chart`, `treatment_plan`, `plan_stage`, `quote`, `dental_consent`, `chair_slot`, `lab_job`; 12 methods incl. `buildPlan`, `implantMilestone`, `raiseLabJob`, `pendingJobs`, `rescheduleStage`).
- **Ayush** (7 tables: `ayush_case_sheet`, `diet_plan`, `repertorization`, `therapy_package`, `therapy_sitting`, `yoga_batch`, `yoga_enrollment`; 16 methods incl. `sellPackage`, `scheduleTherapy`, `recordSitting`, `followupGrid`, `yogaAttendance`).
- **Rehab** (7 tables: `rehab_episode`, `rehab_assessment`, `rehab_goal`, `rehab_sitting`, `exercise_sheet`, `outcome_score`, `rehab_discharge`; 12 methods incl. `openEpisode`, `assess`, `setGoals`, `bookSitting`, `progressChart`, `shareExerciseSheet`).
- **Psych** (10 tables: `psych_assessment`, `scale_result`, `risk_flag`, `safety_plan`, `counselling_session`, `addiction_chart`, `relapse_plan`, `controlled_prescription`, `side_effect_check`, `caregiver_consent`; 15 methods incl. `prescribeControlled` (override ACL), `bookTele`, `closeReadiness`).

### Residents (Aggregate Root)

Long-stay care, not IPD: `resident` + `bed_assignment`/`geriatric_score`/`polypharmacy_review`/`daily_log`/`round`/`visit_log`/`stay_charge`.

**Lifecycle commands**: 15 methods (`admit`, `allocateBed`, `compileStayBill`, `familySummary`, `feedback`, `getResident`, `listResidents`, `logDaily`, `polypharmacyReview`, `raiseAlert`, `recordStayCharge`, `round`, `scoreGeriatric`, `sendFamilySummary`, `visitLog`).

### Pharmacy (Aggregate Root)

`pharmacy_item` + `batch`/`sale`/`return`/`purchase_order`/`grn`/`purchase_invoice`/`stock_transfer`.

**Invariants**: batch-tracked stock; `expiryAlerts`, `stockLedger`, `stockCorrect`, `transferAccept` flows.

**Lifecycle commands**: 16 methods.

### Diagnostics (Aggregate Root)

`lab_test`/`lab_panel`/`lab_order`/`lab_sample`/`lab_result` + `radio_booking`/`radio_report` + `qc_log`.

**Invariants**: order, sample (`collectSample`/`receiveSample`/`sampleReject`), processing, result, deliver; radio book/checkin/report parallel track; `authorize` gated by `diagnostics:authorize` ACL.

**Lifecycle commands**: 22 methods.

### Billing (Aggregate Root)

`invoice`/`receipt`/`advance`/`package_balance`/`credit_debit_note`/`pricelist`.

**Invariants**: `invoiceRaise`, `invoiceFinalize`, then `collect`/`settle`/`settleAdvance`; package sell/redeem/liability/expire; `discount-approve` gated by `billing:discount-approve` ACL.

**Lifecycle commands**: 18 methods.

### Nursing (Aggregate Root)

12 tables: `nursing_task`, `nursing_note`, `nursing_vitals`, `io_entry`, `pain_score`, `nursing_risk_screen`, `drug_administration`, `nursing_escalation`, `daycare_sitting`, `nursing_checklist`, `handover`, `triage_tag`.

**Lifecycle commands**: 14 methods (`board`, `checklistRecord`, `drugAdminister`, `handoverCompile`, `handoverSign`, `ioChart`, `missedEscalate`, `painScore`, `recordNote`, `riskScreen`, `sittingsSupport`, `tasksFromOrders`, `triageTag`, `vitalsChart`).

### Records (Aggregate Root)

`clinical_document`/`share_log`/`medical_register`/`medical_addendum`/`merge_log`/`discharge_summary`/`consent_grant`/`message_log`/`message_optout`.

**Invariants**: `merge` parallels patient merge; `retentionCheck` flags due purges; `sharePrint`/`shareWhatsapp` log out-of-band shares.

**Lifecycle commands**: 21 methods.

### Operations (Aggregate Root)

`report_definition`/`compliance_evidence`/`master_entry`/`seed_run`/`explorer_grant`.

**Invariants**: generic explorer (`explorerQuery`/`explorerGrant`/`explorerExportCsv`), report define/run, compliance evidence list, master upsert/get, seed presets, messaging send/retry/opt-out.

**Lifecycle commands**: 19 methods.

### Staff — removed

Staff, role, roster, attendance, leave-request, and payroll tables are deleted. Use HR instead: `p.hrCore.employee` (profiles), `p.hrCore.access.roles` (roles), `p.hrAttendance.shift` (rosters), `p.hrAttendance.attendance` (attendance), `p.hrLeave.leave` (leave), `p.hrCore.payroll.export` (payroll). Practitioner `employee_id` is a soft text ref to the HR employee record; `posting`/`leave_block` stay as clinical availability for slot computation.

### Admin (Aggregate Root)

`company`/`role`/`master_version`/`template`/`recall_rule`.

**Lifecycle commands**: 14 methods (company save/get, branch create/list/update, template/recall-rule CRUD, master-version save/list, logs).

### Counter (Utility)

`healthcare_counter` backs gapless numbers. No workflow group; used internally by numbering flows.

## Domain Events — 47

One payload shape for all events — `HealthcareEntityEvent { id, branchId, at, actorId?, data? }` — unlike other modules' per-event payloads. Grouped:

| Group            | Events                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Patient (3)      | `healthcare.patient_created`, `healthcare.patient_updated`, `healthcare.patient_merged`                              |
| Practitioner (2) | `healthcare.practitioner_created`, `healthcare.practitioner_updated`                                                 |
| Facility (2)     | `healthcare.facility_created`, `healthcare.facility_updated`                                                         |
| Service (3)      | `healthcare.service_created`, `healthcare.service_updated`, `healthcare.service_redeemed`                            |
| Appointment (2)  | `healthcare.appointment_created`, `healthcare.appointment_updated`                                                   |
| Encounter (3)    | `healthcare.encounter_created`, `healthcare.encounter_updated`, `healthcare.encounter_signed`                        |
| Allopathy (2)    | `healthcare.allopathy_created`, `healthcare.allopathy_updated`                                                       |
| Dental (2)       | `healthcare.dental_created`, `healthcare.dental_updated`                                                             |
| Ayush (2)        | `healthcare.ayush_created`, `healthcare.ayush_updated`                                                               |
| Rehab (2)        | `healthcare.rehab_created`, `healthcare.rehab_updated`                                                               |
| Psych (2)        | `healthcare.psych_created`, `healthcare.psych_updated`                                                               |
| Resident (2)     | `healthcare.resident_created`, `healthcare.resident_updated`                                                         |
| Pharmacy (3)     | `healthcare.pharmacy_created`, `healthcare.pharmacy_updated`, `healthcare.pharmacy_dispensed`                        |
| Diagnostics (3)  | `healthcare.diagnostics_created`, `healthcare.diagnostics_updated`, `healthcare.diagnostics_authorized`              |
| Billing (3)      | `healthcare.billing_created`, `healthcare.billing_updated`, `healthcare.billing_collected`                           |
| Nursing (3)      | `healthcare.nursing_created`, `healthcare.nursing_updated`, `healthcare.nursing_escalated`                           |
| Records (4)      | `healthcare.records_created`, `healthcare.records_updated`, `healthcare.records_merged`, `healthcare.records_viewed` |
| Operations (2)   | `healthcare.operations_created`, `healthcare.operations_updated`                                                     |
| Branch (2)       | `healthcare.branch_created`, `healthcare.branch_updated`                                                             |

`HealthcareEventMap` composes 19 per-group maps by intersection. No `$consumes`; no cross-module subscriptions.

## Command-Query Separation

### Commands (Write Side)

| Context       | Command          | Method                                                       |
| ------------- | ---------------- | ------------------------------------------------------------ |
| Patients      | Register patient | `p.healthcare.patients.register()`                           |
| Patients      | Merge duplicates | `p.healthcare.patients.requestMerge()` then `approveMerge()` |
| Practitioners | Create doctor    | `p.healthcare.practitioners.create()`                        |
| Facilities    | Occupy room      | `p.healthcare.facilities.occupy()` / `release()`             |
| Appointments  | Book visit       | `p.healthcare.appointments.book()` / `reschedule()`          |
| Encounters    | Sign encounter   | `p.healthcare.encounters.sign()`                             |
| Billing       | Raise + collect  | `p.healthcare.billing.invoiceRaise()` then `collect()`       |
| Pharmacy      | Dispense         | `p.healthcare.pharmacy.saleFromRx()`                         |
| Diagnostics   | Order labs       | `p.healthcare.diagnostics.orderLabs()`                       |
| Records       | Merge records    | `p.healthcare.records.merge()`                               |

Every group exposes `create`-style mutations; full lists in `bounded-contexts/healthcare.md`.

### Queries (Read Side)

Each group exposes `get`/`list` plus boards: `queueBoard`, `dayBoard`, `statusBoard`, `collectionReport`, `duesAging`, `tatReport`, `stockLedger`, `timeline`, `explorerQuery`.

## Invariants & Business Rules

6. **Branch scoping** — every mutation input carries `branchId` (defaults `"main"`); `healthcare_branch.subdomain` unique routes pricelist resolution.
7. **Mutations audit + publish; reads silent** — every mutation writes `audit_log` + publishes its `healthcare.*` event; reads publish nothing.
8. **No ADT/IPD/OT/insurance** — residents = long-stay care only; no bed-management ADT, no OT scheduling, no TPA claims.
9. **Stateless runtime** — no pg-boss schedules, no subscriptions; `$prepareRuntime()`/`$cleanup()` empty.
10. **Single event payload** — 47 topics carry `HealthcareEntityEvent`; `data` holds varying detail.
11. **Elevated ACLs are narrow** — only `billing:discount-approve`, `diagnostics:authorize`, `psych:override` exceed CRUD.
