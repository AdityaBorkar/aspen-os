# TODO

- Implement the Framework Tenancy. Use it in an example. Analyze the code written for it.
- Implement `tenant-platform`
- Create both apps for DMS. Update Healthcare&Clinic Application to multi-tenant (isolated). Update recruiter to single-tenant.
  - shaun-healthcare
  - shaun-clinic
  - recruiter-alpauls
  - recruiter-maitriglobal
  - doclabs

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
