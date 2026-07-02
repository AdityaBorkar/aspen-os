# TODO

## Framework

- Perform drizzle migrations in initialize() step. Before that, collect all db_schemas from the registered modules
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
