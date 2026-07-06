# TODO

## Framework

- Perform drizzle migrations in initialize() step. Before that, collect all db_schemas from the registered modules
- ~~Remove the "Module" analogy. The units in @framework/src/* are units of the framework. They remain common and are the base to create and operate new modules. They provide the bones to make the skeleton of a module.~~ DONE - Units are internal building blocks, Modules are optional business functionality.
- Auth
  - Expand to configuring all options for `better-auth`
- `workflow-engine`
  - PRIORITY
- `pubsub`
- `database`
- `cache`
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

## Modules

### HR Module

// index.ts

const roles = [];
const permissions = [];

export const framework = new Framework({
	auth: { roles, permissions },
	files: {
		endpoint: "",
	},
	notifications: {
		whatsapp: {},
		push: {},
	},
});

const hrModule = new HrModule({
	config,
});

const driveModule = new DriveModule({
	config,
});

framework.register([hrModule, driveModule]);

// server.ts
framework.initialize();

---
