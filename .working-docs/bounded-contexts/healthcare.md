# Healthcare Context

> Package: `@aspen-os/healthcare` (kernel) + satellites `diagnostics`, `emr`, `inpatient`, `pharmacy`. OPD clinic kernel — registration, encounters, billing, nursing, records. Stateless throughout; no schedules, no subscriptions. Kernel `$dependencies = ["masters"]`; satellites `$dependencies = ["healthcare"]`.

## Relationship Type

Downstream of Platform (Customer–Supplier) + Masters (kernel depends on masters for org meaning). Implements `Module` interface; `$initialize`/`$prepareRuntime`/`$cleanup` empty — 11 kernel workflow groups, all stateless `readonly` properties (same shape as `tasks`/`notes`). Satellites are shim re-exporters (single-writer kernel), not independent stores.

## Structure (`packages/healthcare/`)

- `Healthcare.create(config?)` — factory; `$config: Required<HealthcareConfig> = { tenantCodePrefix: "HC" }` (runtime frozen via `runtime.ts`)
- `$name = "healthcare"`, `$dependencies = ["masters"]`, no `$consumes`
- 11 workflow groups: `admin`, `appointments`, `billing`, `encounters`, `facilities`, `operations`, `patients`, `practitioners`, `pricelists`, `records`, `services`
- 137 database tables (all `tenant_schemas`, `healthcare_` prefix) + 13 pgEnums; `control_plane_schemas` empty
- 26 domain events sharing `HealthcareEntityEvent` payload (`HealthcareEventMap`)
- 10 ACL resources (CRUD everywhere; elevated only `billing:discount-approve`)
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally
- Has a build step (build script + `build` field in package.json)
- Valibot schemas per group in `schemas/`; `workflow-steps/` holds reusable fetch steps (`fetch-encounter`, `fetch-service`)
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally
- Has a build step (build script + `build` field in package.json)
- Fumadocs source in `docs/`: `index.mdx`, `overview.mdx`, `access-control.mdx`, `db-schemas.mdx`, `events.mdx`, `workflows.mdx`

## Exposed on the platform instance (kernel)

```
p.healthcare.admin          { branch/company/master-version/template/recall-rule/logs }
p.healthcare.appointments   { book/video/slots/queue/checkin/cancel/reschedule/recall/cert }
p.healthcare.billing        { invoice/receipt/advance/package/cndn/pricelist/collect/settle }
p.healthcare.encounters     { create/get/dx/addendum/order/rx/vitals/refill/followup/sign }
p.healthcare.facilities     { create/schedule/block/overlap/occupy/release/sterilize/board }
p.healthcare.operations     { explorer/reports/masters/messaging/compliance/seed }
p.healthcare.patients       { register/dedupe/family/allergy/flag/consent/recall/merge }
p.healthcare.practitioners  { create/schedule/fee/posting/leave/conflict/nextFreeSlot }
p.healthcare.pricelists     { create/get/list/update/publish/bulkRevision/resolvePrice }
p.healthcare.records        { doc/share/register/addendum/merge/timeline/retention }
p.healthcare.services       { create/list/update/publish/price }
```

Satellites (own groups, kernel storage): `p.diagnostics.diagnostics` (22 actions), `p.emr.{allopathy 10, dental 11, ayush 16, rehab 12, psych 14}`, `p.inpatient.{nursing 14, residents 15}`, `p.pharmacy.pharmacy` (16 actions). See `diagnostics.md`, `emr.md`, `inpatient.md`, `pharmacy.md`.

Counts = methods per group (keys in `workflows/index.ts`), not files. Per-action files under `workflows/<group>/`.

## Cross-context integration

- Kernel: none. No `$consumes`, no subscriptions, no schedules, no cross-module table reads. Emits `healthcare.*` only.
- Satellites emit their own namespaces (`diagnostics.*`, `emr.*`, `inpatient.*`, `pharmacy.*`); Tasks subscribes `inpatient.nursing_created` + `healthcare.encounter_updated`; Comms subscribes `healthcare.records_created` + `inpatient.resident_updated`; Calendar subscribes `healthcare.appointment_created/updated` + `healthcare.patient_updated`.

## Language

- Patient, Practitioner, Facility, Service, Pricelist, Appointment, Encounter, Allopathy, Dental, Ayush, Rehab, Psych, Resident (long-stay, not IPD), Pharmacy, Diagnostics, Billing, Nursing, Records, Operations, Branch (`healthcare_branch`: `subdomain` UNIQUE routing row, `branchId` defaults `"main"`), Counter (gapless numbers)
- Staff, roster, attendance, leave, and payroll live in HR (`hrCore.employee`/`hrCore.payroll`, `hrAttendance`, `hrLeave`); practitioner `employee_id` is a soft text ref, never a join
- Avoid: Branch for org structure (that is Organization `Branch` / Masters `orgBranch` — healthcare Branch is a subdomain routing row); Resident for IPD admission (no ADT here); Insurance/TPA (out of scope); OT scheduling (out of scope)
