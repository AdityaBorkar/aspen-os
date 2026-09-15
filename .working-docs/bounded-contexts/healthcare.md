# Healthcare Context

> Package: `@aspen-os/healthcare`. OPD clinic backend — registration, five-specialty EMR, pharmacy, diagnostics, billing, nursing, records. Stateless domain module; no schedules, no subscriptions.

## Relationship Type

Downstream of Platform (Customer–Supplier). Implements `Module` interface; `$initialize`/`$prepareRuntime`/`$cleanup` empty — 21 workflow groups, all stateless `readonly` properties (same shape as `tasks`/`notes`).

## Structure (`packages/healthcare/`)

- `Healthcare.create(config?)` — factory; `$config: Required<HealthcareConfig> = { tenantCodePrefix: "HC" }` (runtime frozen via `runtime.ts`)
- `$name = "healthcare"`, `$dependencies = []`, no `$consumes`
- 21 workflow groups (289 action files under `workflows/<group>/<verb>.ts`, one action per file, + `index.ts` router + `pricelists/shared.ts` helpers): `admin` (14), `allopathy` (10), `appointments` (14), `ayush` (16), `billing` (18), `dental` (12), `diagnostics` (22), `encounters` (10), `facilities` (11), `nursing` (14), `operations` (19), `patients` (14), `pharmacy` (16), `practitioners` (13), `pricelists` (10), `psych` (15), `records` (21), `rehab` (12), `residents` (15), `services` (11), `staff` (10)
- 140 database tables (all `tenant_schemas`, `healthcare_` prefix) + 13 pgEnums; `control_plane_schemas` empty
- 47 domain events sharing `HealthcareEntityEvent` payload (`HealthcareEventMap`)
- 19 ACL resources (CRUD everywhere; elevated only `billing:discount-approve`, `diagnostics:authorize`, `psych:override`)
- Valibot schemas per group in `schemas/`; `workflow-steps/` holds reusable fetch steps (`fetch-encounter`, `fetch-service`)
- `$prepareInfra()` returns declarative infra (db schemas, acl, events) — schema pushing handled centrally
- Has a build step (build script + `build` field in package.json)
- Fumadocs source in `docs/`: `index.mdx`, `overview.mdx`, `access-control.mdx`, `db-schemas.mdx`, `events.mdx`, `workflows.mdx`

## Exposed on the platform instance

```
p.healthcare.admin          { 14 methods: branch/company/master-version/template/recall-rule/logs }
p.healthcare.allopathy      { 10 methods: soap/exam/problem/interaction/chronic/immunize/register/triage }
p.healthcare.appointments   { 14 methods: book/video/slots/queue/checkin/cancel/reschedule/recall/cert }
p.healthcare.ayush          { 16 methods: casesheet/diet/repertorize/package/sitting/yoga/followup }
p.healthcare.billing        { 18 methods: invoice/receipt/advance/package/cndn/pricelist/collect/settle }
p.healthcare.dental         { 12 methods: chart/plan/stage/quote/consent/chair/lab-job/implant }
p.healthcare.diagnostics    { 22 methods: test-master/panel/order/sample/result/radio/qc/tat }
p.healthcare.encounters     { 10 methods: create/get/dx/addendum/order/rx/vitals/refill/followup/sign }
p.healthcare.facilities     { 11 methods: create/schedule/block/overlap/occupy/release/sterilize/board }
p.healthcare.nursing        { 14 methods: board/note/vitals/io/pain/risk/drug/escalation/handover/tag }
p.healthcare.operations     { 19 methods: explorer/reports/masters/messaging/compliance/seed }
p.healthcare.patients       { 14 methods: register/dedupe/family/allergy/flag/consent/recall/merge }
p.healthcare.pharmacy       { 16 methods: item/batch/sale/return/PO/GRN/invoice/transfer/ledger }
p.healthcare.practitioners  { 13 methods: create/schedule/fee/posting/leave/conflict/nextFreeSlot }
p.healthcare.pricelists     { 10 methods: create/get/list/update/publish/bulkRevision/resolvePrice }
p.healthcare.psych          { 15 methods: assess/scale/risk/safety/counsel/tele/relapse/controlled-rx }
p.healthcare.records        { 21 methods: doc/share/register/addendum/merge/timeline/retention }
p.healthcare.rehab          { 12 methods: episode/assess/goals/sitting/package/day-board/discharge }
p.healthcare.residents      { 15 methods: admit/bed/daily/round/visit/charge/bill/summary/feedback }
p.healthcare.services       { 11 methods: create/list/update/publish/price }
p.healthcare.staff          { 10 methods: upsert/role/roster/attendance/leave/payroll }
```

Counts = methods per group (keys in `workflows/index.ts`), not files. Per-action files under `workflows/<group>/`.

## Cross-context integration

- None. No `$consumes`, no subscriptions, no schedules, no cross-module table reads. Emits `healthcare.*` only; no other module subscribes yet.

## Language

- Patient, Practitioner, Facility, Service, Pricelist, Appointment, Encounter, Allopathy, Dental, Ayush, Rehab, Psych, Resident (long-stay, not IPD), Pharmacy, Diagnostics, Billing, Nursing, Records, Operations, Staff, Branch (`healthcare_branch`: `subdomain` UNIQUE routing row, `branchId` defaults `"main"`), Counter (gapless numbers)
- Avoid: Branch for org structure (that is Organization `Branch` / Masters `orgBranch` — healthcare Branch is a subdomain routing row); Resident for IPD admission (no ADT here); Insurance/TPA (out of scope); OT scheduling (out of scope)
