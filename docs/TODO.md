# TODO

## Goals

- Ensure auth seeding
- Client: RPC, Log
- 
- Standardizing the types in `framework`
- 
- Log:
  - https://errore.org/
  - https://loggingsucks.com/
- 
- Workflows Engine & BPNM??
  - https://www.inngest.com/
  - https://temporal.io/
  - https://www.flowable.com/open-source
  - https://www.activiti.org/
  - https://www.npmjs.com/package/bpmn-engine
- 
- Ensure events are properly published and consumed (pubsub)
- Ensure logging works as intended. Structured logging.
- storage
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

## Modules

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
