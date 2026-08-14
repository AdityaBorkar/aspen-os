# TODO

Refactor all workflows to use a REST like naming convention and use folders as well for the modules.
Example: class.add-field.ts => class/field/add.ts

---

Ask questions on certain file names

tasks

dms

- templates

notifications

comms-*

- Link custom emails, whatsapp, etc to the application

Create a scope of work for the "chat" module to add the following features:

chat
discussions

inventory

- goods
- services

scheduler

Create a scope of work for the "Tasks" module to add the following features:

- tasks
- notes

Create a scope of work for the "Organization" module to add the following features:

- orgs
- contacts
- drafts

Create a scope of work for the CRM module

- deals
- crm

doc_issuance / file-management in DMS

reports

compliance

accounting

---

WORK ON DMS

WORK ON ORGANIZATION

- [ ] Organization
  - Branches
  - Contacts
  - Addresses
  - Bank Accounts
  - Filter Views
  - Personal Drafts & Drafts
  - Personal Dashboard & Dashboards

WORK ON HR MODULE

- Canvas like Users
- Custom Roles and RBAC Permissions
- Users with Branch-wise access controls

WORK ON TASK MANAGEMENT

## Bugs

- DB Schemas
  - Drizzle Migrations could not be performed (using pushSchema instead — see ADR-0004)
  - How to handle migrations?
  - Export utility functions like lastUpdatedAt(), uuidv7()
- ACL List
  - How to handle migrations?
- PubSub Events
  - How to handle migrations?
- Replace zod with valibot entirely everywhere

## Module Implementation

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
