# TODO

Replace zod with valibot entirely
/init
docs -> ./.working-docs
Update CODING_CONVENTIONS.md as per the current design and state of the repository.
/domain-modelling Update ADRs to reflect the current design and state of the repository.

WORK ON ORGANIZATION
- [ ] Organization
  - Filter Views
  - Addresses
  - Bank Accounts
  - Personal Drafts
  - Personal Dashboard / Dashboards
  - Branches & Organization
Refactor all modules to be like ./management. Make it a skill
WORK ON DMS
WORK ON TASK MANAGEMENT
WORK ON HR MODULE
  - Implement the HR module
  - Canvas like Users
  - Custom Roles and RBAC Permissions
  - Users with Branch-wise access controls
- [ ] CRM
- [ ] HOSPITAL
- [ ] RECRUITER
- [ ] ERP

- Create both apps for DMS. Update Healthcare&Clinic Application to multi-tenant (isolated). Update recruiter to single-tenant.
  - shaun-healthcare
  - shaun-clinic
  - recruiter-alpauls
  - recruiter-maitriglobal
  - doclabs

---

## Bugs

DB Schemas (How to handle migrations?)
ACL List (How to handle migrations?)
PubSub Events (How to handle migrations?)

## Module Implementation

- Drizzle Migrations could not be performed (using pushSchema instead — see ADR-0004)
- [ ] Standardization
  - `framework` types
  - `framework` module types
- [ ] Accounting
  - Ledger
  - Transactions
  - Accounts
  - Banking???
  - Sales???
  - Purchase???
  - Vouchers???
- [ ] Fleet
- [ ] Inventory
- [ ] Reports
- [ ] Pharmacy

## Support Module

Support = No Account Code. Grant Access. -> Download Screen Control Module and then show the screen to the operator.

First, Partner Support: Name, Role=Account Manager, Phone Number
Second, Application Support: Name, Role=Account Manager, Phone Number
Second, Raise Ticket, Request Callback

Show a Notification - Account Manager is requesting access to the application. YES / NO.
If you have not requested for support, press NO.
If you press YES, the account manager shall access the application and respond accordingly.

## Compliance Module

- India DPDP
- India Compliance
- GDPR
- HIPAA

---

## Phase 2

- Merging ./docs with ./docs to ensure a single source of truth
- Create a Biome GritQL rule to make index.ts module files like @management/src/index.ts
- CONTEXT.md lists Prospect, Client, Job Mandate, Draft, Filter View, Reminder, Task, Team Member, Contract under "Recruiter Domain."
- Dynamic Loading of Modules
  - /settings/features = Enable/Disable each module and their feature flags

## Not a Priority

- Analytics
- Chatbot
- Agents
- Automations
