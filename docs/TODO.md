# TODO

## Goals

npx drizzle-kit studio --host=0.0.0.0 --port=3000 --config=?

- Perform drizzle migrations in prepare() step. Before that, collect all db_schemas from the registered modules
- Ensure database schemas and migration
- initialize()
- 
- Ensure authentication and custom roles and users
- Ensure auth seeding
- 
- Ensure events are properly published and consumed (pubsub)
- Ensure logging works as intended. Structured logging.
- 
- storage
-
- /grill-with-docs
- /improve-codebase-architecture

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
