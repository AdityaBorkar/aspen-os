# EMR Domain Model

> Package: `@aspen-os/emr` (`$name = "emr"`, `$dependencies = ["healthcare"]`). Stateless shim over the healthcare kernel — owns zero tables; `emrTables` (56 refs: 7 allopathy + 7 dental + 7 ayush + 7 rehab + 10 psych + 7 encounters + 1 observation + 1 condition + 9 patient) re-exports kernel storage.

## Aggregates

- **Allopathy** (10 actions): soap/exam/problem/interaction/chronic/immunize/register/triage.
- **Dental** (11 actions): chart/plan/stage/quote/consent/chair/lab-job/implant.
- **Ayush** (16 actions): casesheet/diet/repertorize/package/sitting/yoga/followup.
- **Rehab** (12 actions): episode/assess/goals/sitting/package/day-board/discharge.
- **Psych** (14 actions): assess/scale/risk/safety/counsel/tele/relapse/controlled-rx.

**Invariants**: `psych:override` is the only elevated ACL (controlled prescriptions); all other resources CRUD-only.

## Domain Events — 10

`{allopathy,dental,ayush,rehab,psych}.created` + `.{...}.updated` (2 each).

## Invariants & Business Rules

1. **Shim storage** — no owned tables/enums; single-writer kernel pattern.
2. **Stateless runtime** — empty lifecycle; no schedules, no subscriptions.
