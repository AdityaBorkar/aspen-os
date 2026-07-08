# TODO

## Goals

- Ensure auth seeding
- Client: RPC, Log
- 
- Standardizing the types in `framework`
- Module Integration and Standardization
- 
- Log:
  - https://errore.org/
  - https://loggingsucks.com/
  - Ensure logging works as intended. Structured logging.
- 
- Workflows Engine & BPNM??
  - https://www.inngest.com/
  - https://temporal.io/
  - https://www.flowable.com/open-source
  - https://www.activiti.org/
  - https://www.npmjs.com/package/bpmn-engine
- 
- PubSub
  - Ensure events are properly published and consumed (pubsub)
- 
- Storage
- 
- /grill-with-docs
- /improve-codebase-architecture

## Issues

- Drizzle Migrations could not be performed

## Documentation

- Parts of the Framework
- How to use the framework? What can be customized?
- Unit vs Module?
- How to create a Custom Module?

- List of Modules
- Features and Configuration in each module.

## Units

## List of Units (in order of precendence)

- Pubsub
- Workflows (BPNM)
- RPC
- AI

## Modules

### List of Modules (in order of precendence)

- Project Management https://frappe.io/erpnext/open-source-project-management-software
- Quality Assurance https://frappe.io/erpnext/open-source-quality-management-software
- 
- ATS
- Patient Management
- 
- Accounting https://frappe.io/erpnext/open-source-accounting
- Sales https://frappe.io/erpnext/open-source-sales-invoicing
- Purchasing https://frappe.io/erpnext/open-source-procurement
- 
- Inventory https://frappe.io/erpnext/open-source-inventory-management-system
- Asset Management https://frappe.io/erpnext/open-source-asset-management-software
- 
- CRM https://frappe.io/crm
- 
- Helpdesk https://frappe.io/helpdesk
- 
- Payments & POS https://frappe.io/erpnext/open-source-pos-software

### HR Module

// index.ts

const roles = [];
const permissions = [];

const hrModule = new HrModule({
	config,
});

const driveModule = new DriveModule({
	config,
});

export const framework = await Framework.create({
	auth: { roles, permissions },
	files: {
		endpoint: "",
	},
	notifications: {
		whatsapp: {},
		push: {},
	},
}, [hrModule, driveModule]);

## Triage

- workflows = True Workflows like Cloudflare and Vercel
- kv-store
- notification
- rpc
- sync
- Auth
  - Expand to configuring all options for `better-auth`
- `events`
  - THINK
- `config`
  - THINK
- Analytics
  - THINK
- Audit Logs
  - THINK
- Locking
  - Is it required? We have Postgres Transactions.
  - THINK
