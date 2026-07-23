# TODO

DB Schemas (How to handle migrations?)

ACL List (How to handle migrations?)

PubSub Events (How to handle migrations?)

Refactor the code to use domain-specific, hierarchical input structures instead of flat parameter objects. Group related fields into nested objects that match their usage, eliminating unnecessary object reconstruction and conditional schema processing. Design APIs so each function receives data in the shape it actually consumes. Similarly, optimize to use valibot validation schema as much possible for input validation.

---

Provisioning?
Use the workflows in ManagementPlane to create a web application

---

- Create both apps for DMS. Update Healthcare&Clinic Application to multi-tenant (isolated). Update recruiter to single-tenant.
  - shaun-healthcare
  - shaun-clinic
  - recruiter-alpauls
  - recruiter-maitriglobal
  - doclabs
- Start working on the modules

## Improving Code Quality

Create a Biome GritQL rule to make index.ts module files like @management-plane/src/index.ts

## Module Implementation

- [ ] Organization
  - Filter Views
  - Addresses
  - Bank Accounts
  - Personal Drafts
  - Personal Dashboard / Dashboards
- Drizzle Migrations could not be performed (using pushSchema instead — see ADR-0004)
- [ ] CRM
- [ ] Standardization
  - `framework` types
  - `framework` module types
- [ ] Notification unit
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

## HR Module

- Implement the HR module
- Canvas like Users
- Custom Roles and RBAC Permissions
- Users with Branch-wise access controls

## Support Module

Support = No Account Code. Grant Access. -> Download Screen Control Module and then show the screen to the operator.

First, Partner Support: Name, Role=Account Manager, Phone Number
Second, Application Support: Name, Role=Account Manager, Phone Number
Second, Raise Ticket, Request Callback

Show a Notification - Account Manager is requesting access to the application. YES / NO.
If you have not requested for support, press NO.
If you press YES, the account manager shall access the application and respond accordingly.

## Task Management Module

- Task Management

## Compliance Module

- India DPDP
- India Compliance
- GDPR
- HIPAA

## Phase 2

- CONTEXT.md lists Prospect, Client, Job Mandate, Draft, Filter View, Reminder, Task, Team Member, Contract under "Recruiter Domain."
- Dynamic Loading of Modules
  - /settings/features = Enable/Disable each module and their feature flags

## Not a Priority

- Analytics
- Chatbot
- Agents
- Automations
