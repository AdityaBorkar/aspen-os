# Compliance Context

> Package: `@aspen-os/compliance`. Domain module for regulatory/legal document verification — documents, obligations (recurring schedules), and verification rules.

## Relationship Type

Downstream of the Platform (Customer–Supplier). Runtime-wired — receives `{ db, kvStore, pubsub }` via `$initialize(units)` and registers schedules/handlers in `$prepareRuntime()`.

## Structure (`packages/compliance/`)

- `Compliance.create(config)` — factory returning a Module instance; `$config: ComplianceModuleConfig = { country: "INDIA", dashboardCacheTtl?, defaultEscalationDays?, defaultReminderDays? }`
- `$name = "compliance"`, `$dependencies = []`
- 5 workflow groups: `documents`, `obligations`, `verification`, `audit`, `dashboard`
- 3 services: `ReminderEngine`, `ObligationGenerator`, `EventBridge` — registered in `$prepareRuntime()`, unregistered in `$cleanup()`. `StatusDerivation` is a utility (pure functions used internally by workflows and the reminder engine, not lifecycle-managed).
- 3 database tables (all `tenant_schemas`): `compliance_document`, `compliance_obligation`, `compliance_verification_rule`
- 23 domain events published via PubSub (`ComplianceEventMap`)
- 3 ACL resources: `complianceDocument`, `complianceObligation`, `complianceVerificationRule`
- `$prepareRuntime()` — registers reminder cron schedules, the obligation generator handler, and event-bridge subscriptions
- Audit entries written via the platform's `ctx.audit.write(...)` (the `audit` workflow group queries the platform `audit_log` via `ctx.audit.query(...)`) — no module-local audit table

## Scheduled jobs (registered in `$prepareRuntime()`)

| Topic                                | Cron        | Action                              |
| ------------------------------------ | ----------- | ----------------------------------- |
| `compliance:daily-expiry-scan`       | `0 8 * * *` | Scan expiring documents             |
| `compliance:daily-status-transition` | `0 0 * * *` | Transition expired/overdue statuses |
| `compliance:daily-escalation`        | `0 9 * * *` | Escalate past threshold             |
| `compliance:weekly-summary`          | `0 9 * * 1` | Generate weekly summary             |
| `compliance:obligation-generate`     | `0 6 * * *` | Generate documents from obligations |

## Cross-context event subscriptions (EventBridge)

The `EventBridge` service subscribes to events from other modules to auto-create compliance documents and obligations:

| Subscribed topic                    | Source module     | Action                                                              |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------- |
| `hr:employee_onboarded`             | HR                | Creates background check + ID verification documents                |
| `hr:employee_separated`             | HR                | Creates exit documents + final settlement documents                 |
| `fleet:vehicle_registered`          | Fleet (stub)      | Creates pollution certificate + semi-annual obligation              |
| `organization:branch_created`       | Organization      | Creates trade license + fire safety certificate + annual obligation |
| `accounting:financial_year_started` | Accounting (stub) | Creates monthly GST return obligation                               |
| `organization:connection_created`   | Organization      | Creates insurance policy document (if type is insurer)              |

## Language

- Compliance Document, Compliance Obligation, Verification Rule, Audit Entry, Verification Status, Renewal Chain, Reminder Engine, Obligation Generator, Event Bridge, StatusDerivation, ComplianceModuleConfig
- Avoid: Certificate/Permit/Regulatory Record (for Document), Recurring Task (for Obligation), Review Policy (for Verification Rule), Notification Service (for Reminder Engine)
