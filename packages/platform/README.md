# @aspen-os/platform

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Tenancy](#tenancy)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Platform Lifecycle](#framework-lifecycle)
- [Server Platform](#server-framework)
  - [PlatformConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Platform](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The platform is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/platform/server` | Node/Bun |
| Client | `@aspen-os/platform/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/platform/server` or `@aspen-os/platform/client` explicitly.

## Installation

```bash
bun install
```

The platform is an internal workspace package (`workspace:*`). It can be published to npm via `bun run publish` (runs build then `bun publish`).

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
    tenancy: { mode: "single" },
  },
  { organization },
)

await platform.prepare()

await platform.run(async () => {
  // AsyncLocalStorage context provides { auth, db, pubsub, tenantId? }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await platform.destroy()
```

## Tenancy

The platform supports three tenancy architectures as a **config-time choice**. The developer picks one mode in `PlatformConfig.tenancy` and commits to it for the application's lifetime. The same module code works transparently across all three modes.

| Mode | Databases | Isolation | Connection routing |
|---|---|---|---|
| **Single Tenant** | 1 | None needed | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Per-tenant pool resolution |

```ts
// Single tenant
tenancy: { mode: "single" }

// Shared DB with Row-Level Security
tenancy: { mode: "shared" }

// Isolated database per tenant
tenancy: {
  mode: "isolated",
  resolver: {
    resolve: async (tenantId) => ({ /* DatabaseConfig */ }),
    list: async () => ["tenant_1", "tenant_2"],
  },
}
```

### `run()` Signatures

```ts
// Single-tenant mode
await platform.run(async () => { /* db resolves to control-plane */ });

// Multi-tenant modes
await platform.run(tenantId, async () => { /* db resolves per-request/per-tenant */ });
```

### Key Design Points

- **Stable DB wrapper** — `DatabaseUnit.db` is a getter returning a Proxy that resolves the correct drizzle instance per-request via `AsyncLocalStorage`. Workflows keep `this.db = units.db.db` — no workflow code changes.
- **Control-plane connection always** — `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.
- **`tenant_id` column always present** — Every table (except auth) gains `tenant_id` with `DEFAULT COALESCE(current_setting('app.tenant_id', true), 'default')`. Avoids conditional schema definitions.
- **RLS via post-push SQL** — In shared mode, the platform discovers all tables with `tenant_id` and applies RLS policies after `pushSchema()` during `prepare()`.
- **Per-tenant PubSub** — In isolated mode, each tenant DB has its own pg-boss. `PubSubUnit` routes based on context `tenantId`.
- **`$prepareTenant(tenantId)`** — New optional `Module` lifecycle method. Called per-tenant in isolated mode for cron/subscription registration.

## Package Exports

```json
{
  "exports": {
    "./client": {
      "default": "./.output/client/index.js",
      "types": "./.output/client/index.d.ts"
    },
    "./server": {
      "default": "./.output/server/index.js",
      "types": "./.output/server/index.d.ts"
    }
  },
  "bin": { "aspen": "./.output/cli/index.js" }
}
```

The platform has a **build step** (`bun run build` in `packages/framework` runs `../../scripts/build.ts` → emits `.output/`). Published `exports` and `bin` point at compiled JS + `.d.ts`. A `build` field in `package.json` maps the same keys to source `.ts` so in-workspace dev resolves to source with no build (Bun feature). Domain modules have no build step — their `exports` point at raw `.ts`.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $cleanup(): Promise<void>
  $prepare?(): Promise<void>
}
```

Server units use the `# @aspen-os/platform

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Tenancy](#tenancy)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Platform Lifecycle](#framework-lifecycle)
- [Server Platform](#server-framework)
  - [PlatformConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Platform](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The platform is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/platform/server` | Node/Bun |
| Client | `@aspen-os/platform/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/platform/server` or `@aspen-os/platform/client` explicitly.

## Installation

```bash
bun install
```

The platform is an internal workspace package (`workspace:*`). It can be published to npm via `bun run publish` (runs build then `bun publish`).

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
    tenancy: { mode: "single" },
  },
  { organization },
)

await platform.prepare()

await platform.run(async () => {
  // AsyncLocalStorage context provides { auth, db, pubsub, tenantId? }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await platform.destroy()
```

## Tenancy

The platform supports three tenancy architectures as a **config-time choice**. The developer picks one mode in `PlatformConfig.tenancy` and commits to it for the application's lifetime. The same module code works transparently across all three modes.

| Mode | Databases | Isolation | Connection routing |
|---|---|---|---|
| **Single Tenant** | 1 | None needed | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Per-tenant pool resolution |

```ts
// Single tenant
tenancy: { mode: "single" }

// Shared DB with Row-Level Security
tenancy: { mode: "shared" }

// Isolated database per tenant
tenancy: {
  mode: "isolated",
  resolver: {
    resolve: async (tenantId) => ({ /* DatabaseConfig */ }),
    list: async () => ["tenant_1", "tenant_2"],
  },
}
```

### `run()` Signatures

```ts
// Single-tenant mode
await platform.run(async () => { /* db resolves to control-plane */ });

// Multi-tenant modes
await platform.run(tenantId, async () => { /* db resolves per-request/per-tenant */ });
```

### Key Design Points

- **Stable DB wrapper** — `DatabaseUnit.db` is a getter returning a Proxy that resolves the correct drizzle instance per-request via `AsyncLocalStorage`. Workflows keep `this.db = units.db.db` — no workflow code changes.
- **Control-plane connection always** — `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.
- **`tenant_id` column always present** — Every table (except auth) gains `tenant_id` with `DEFAULT COALESCE(current_setting('app.tenant_id', true), 'default')`. Avoids conditional schema definitions.
- **RLS via post-push SQL** — In shared mode, the platform discovers all tables with `tenant_id` and applies RLS policies after `pushSchema()` during `prepare()`.
- **Per-tenant PubSub** — In isolated mode, each tenant DB has its own pg-boss. `PubSubUnit` routes based on context `tenantId`.
- **`$prepareTenant(tenantId)`** — New optional `Module` lifecycle method. Called per-tenant in isolated mode for cron/subscription registration.

## Package Exports

```json
{
  "exports": {
    "./client": {
      "default": "./.output/client/index.js",
      "types": "./.output/client/index.d.ts"
    },
    "./server": {
      "default": "./.output/server/index.js",
      "types": "./.output/server/index.d.ts"
    }
  },
  "bin": { "aspen": "./.output/cli/index.js" }
}
```

The platform has a **build step** (`bun run build` in `packages/framework` runs `../../scripts/build.ts` → emits `.output/`). Published `exports` and `bin` point at compiled JS + `.d.ts`. A `build` field in `package.json` maps the same keys to source `.ts` so in-workspace dev resolves to source with no build (Bun feature). Domain modules have no build step — their `exports` point at raw `.ts`.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $cleanup(): Promise<void>
  $prepare?(): Promise<void>
}
```

 prefix for lifecycle methods (`$name`, `$prepare`, `$cleanup`) to avoid collisions with the unit's own public API. Client units use the same `# @aspen-os/platform

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Tenancy](#tenancy)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Platform Lifecycle](#framework-lifecycle)
- [Server Platform](#server-framework)
  - [PlatformConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Platform](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The platform is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/platform/server` | Node/Bun |
| Client | `@aspen-os/platform/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/platform/server` or `@aspen-os/platform/client` explicitly.

## Installation

```bash
bun install
```

The platform is an internal workspace package (`workspace:*`). It can be published to npm via `bun run publish` (runs build then `bun publish`).

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
    tenancy: { mode: "single" },
  },
  { organization },
)

await platform.prepare()

await platform.run(async () => {
  // AsyncLocalStorage context provides { auth, db, pubsub, tenantId? }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await platform.destroy()
```

## Tenancy

The platform supports three tenancy architectures as a **config-time choice**. The developer picks one mode in `PlatformConfig.tenancy` and commits to it for the application's lifetime. The same module code works transparently across all three modes.

| Mode | Databases | Isolation | Connection routing |
|---|---|---|---|
| **Single Tenant** | 1 | None needed | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Per-tenant pool resolution |

```ts
// Single tenant
tenancy: { mode: "single" }

// Shared DB with Row-Level Security
tenancy: { mode: "shared" }

// Isolated database per tenant
tenancy: {
  mode: "isolated",
  resolver: {
    resolve: async (tenantId) => ({ /* DatabaseConfig */ }),
    list: async () => ["tenant_1", "tenant_2"],
  },
}
```

### `run()` Signatures

```ts
// Single-tenant mode
await platform.run(async () => { /* db resolves to control-plane */ });

// Multi-tenant modes
await platform.run(tenantId, async () => { /* db resolves per-request/per-tenant */ });
```

### Key Design Points

- **Stable DB wrapper** — `DatabaseUnit.db` is a getter returning a Proxy that resolves the correct drizzle instance per-request via `AsyncLocalStorage`. Workflows keep `this.db = units.db.db` — no workflow code changes.
- **Control-plane connection always** — `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.
- **`tenant_id` column always present** — Every table (except auth) gains `tenant_id` with `DEFAULT COALESCE(current_setting('app.tenant_id', true), 'default')`. Avoids conditional schema definitions.
- **RLS via post-push SQL** — In shared mode, the platform discovers all tables with `tenant_id` and applies RLS policies after `pushSchema()` during `prepare()`.
- **Per-tenant PubSub** — In isolated mode, each tenant DB has its own pg-boss. `PubSubUnit` routes based on context `tenantId`.
- **`$prepareTenant(tenantId)`** — New optional `Module` lifecycle method. Called per-tenant in isolated mode for cron/subscription registration.

## Package Exports

```json
{
  "exports": {
    "./client": {
      "default": "./.output/client/index.js",
      "types": "./.output/client/index.d.ts"
    },
    "./server": {
      "default": "./.output/server/index.js",
      "types": "./.output/server/index.d.ts"
    }
  },
  "bin": { "aspen": "./.output/cli/index.js" }
}
```

The platform has a **build step** (`bun run build` in `packages/framework` runs `../../scripts/build.ts` → emits `.output/`). Published `exports` and `bin` point at compiled JS + `.d.ts`. A `build` field in `package.json` maps the same keys to source `.ts` so in-workspace dev resolves to source with no build (Bun feature). Domain modules have no build step — their `exports` point at raw `.ts`.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $cleanup(): Promise<void>
  $prepare?(): Promise<void>
}
```

 prefix — both interfaces are identical.

Seven core units are required: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`.

### Modules

A **Module** is a business logic plugin. The `Module` interface:

```ts
interface Module<N extends string = string> {
  readonly $name: N
  $initialize?(units: Record<string, Unit>): void
  $prepare?(): Promise<void>
  $prepareTenant?(tenantId: string): Promise<void>  // isolated mode
  $cleanup(): Promise<void>
}
```

Modules are passed as a named object to `Platform.create()`. Module `$name`s become proxy keys: `platform.organization` returns the module instance.

### Platform Lifecycle

```
Platform.create(config, modules)
    --> validates tenancy config
    --> instantiates 7 units (dependency-injected via constructor)
    --> cross-wires pubsub <-> auth
    --> calls module.$initialize(units) for each module
    --> returns proxy-wrapped PlatformInstance

platform.prepare()
    --> unit.$prepare() for each unit (DatabaseUnit pushes core schemas)
    --> module.$prepare() for each module (modules push domain schemas, register pubsub handlers)
    --> shared: applyRlsPolicies() to all tables with tenant_id
    --> isolated: $prepareTenant(tenantId) for each tenant + each module

platform.run(fn)
    --> executes fn inside AsyncLocalStorage providing { auth, db, pubsub, tenantId? }

platform.run(tenantId, fn)   --> multi-tenant: per-request db + tenantId in context

platform.destroy()
    --> module.$cleanup() for each module
    --> unit.$cleanup() for each unit
```

`prepare()` and `destroy()` catch and log errors per-unit/module/tenant. They do not throw on individual failures.

## Server Platform

### PlatformConfig

All seven units are required:

```ts
type PlatformConfig = {
  auth: AuthConfig
  db: DatabaseConfig
  kvStore: KvStoreConfig
  logs: LogConfig
  pubsub: PubSubConfig
  rpc: RpcConfig
  storage: StorageConfig
  tenancy: TenancyConfig
}
```

All seven units are required, plus a `tenancy` config that selects the tenancy mode.

### The Seven Core Units

Units are instantiated in dependency order inside `Platform.create()`:

| Unit | Class | Injected Deps | $name |
|---|---|---|---|
| `db` | `DatabaseUnit` | -- | `"db"` |
| `logs` | `LogUnit` | `{ db }` | `"logs"` |
| `pubsub` | `PubSubUnit` | `{ db }` | `"pubsub"` |
| `auth` | `AuthUnit` | `{ db }` | `"auth"` |
| `storage` | `StorageUnit` | `{ db }` | `"storage"` |
| `kvStore` | `KvStoreUnit` | `{ db }` | `"kvStore"` |
| `rpc` | `RpcUnit` | `{ auth, db, logs, pubsub }` | `"rpc"` |

### DatabaseUnit

Owns a control-plane `pg.Pool` and a drizzle `NodePgDatabase` instance. In isolated mode, also manages per-tenant pools.

```ts
type DatabaseConfig = {
  database: string
  host: string
  port: number
  user: string
  password: string
  ssl?: boolean
  maxConnections?: number  // default: 20
}
```

The `db` config is always the **control-plane** database. In single/RLS mode, this IS the app database. In isolated mode, this is the control-plane database; per-tenant DBs are resolved by the `TenantResolver`.

`$prepare()` uses `pushSchema()` from `drizzle-kit/api` to apply core schemas (auth, logs, storage, kv-store). In shared mode, RLS policies are applied after all schemas are pushed.

`getSchemas()` returns the merged schema object for all core unit tables.

```ts
// Access
platform.db.db               // stable wrapper (Proxy) — resolves per-request via AsyncLocalStorage
platform.db.controlPlaneDb    // drizzle NodePgDatabase — control-plane connection
platform.db.pool              // pg.Pool — control-plane connection pool
platform.db.config            // DatabaseConfig
platform.db.tenancyMode       // "single" | "shared" | "isolated"
platform.db.getSchemas()      // merged core schemas

// Per-tenant (isolated mode)
platform.db.getTenantDb(tenantId)                    // Promise<NodePgDatabase>
platform.db.pushSchemasToTenant(tenantId, schemas)   // provisioning
```

### AuthUnit

Wraps [better-auth](https://www.better-auth.com) with plugins: `admin`, `username`, `organization`, `phoneNumber`, `emailOTP`, `apiKey`, `lastLoginMethod`, `twoFactor`, `passkey`, `captcha` (Cloudflare Turnstile, conditional on `cfSecretKey`).

```ts
interface AuthConfig {
  access_control: ReturnType<typeof createAccessControl>
  baseURL: string
  secret: string
  cfSecretKey?: string
  session: { expiresIn?: number }
  roles: Record<string, Role>
  socialProviders?: {
    google?: { clientId: string; clientSecret: string; redirectURI?: string }
  }
}
```

The public API (accessed via `platform.auth`):

```ts
// Raw betterAuth Auth instance
platform.auth.auth

// HTTP handler for auth routes
platform.auth.fetch_handler(request: Request): Promise<Response>

// User workflows
platform.auth.user.create({ email, name?, password })  // Promise<User>
platform.auth.user.get({ id }) | platform.auth.user.get({ email })  // Promise<User | null>
platform.auth.user.update({ id, data })  // Promise<User>
platform.auth.user.delete({ id })  // Promise<void>
platform.auth.user.role.assign({ userId, roleName })  // Promise<void>
platform.auth.user.role.unassign({ userId })  // Promise<void>

// Session workflows
platform.auth.session.create({ email, password })  // Promise<{ user, session }>
platform.auth.session.validate({ token })  // Promise<{ user, session } | null>
platform.auth.session.invalidate({ sessionId })  // Promise<void>

// Role workflows
platform.auth.role.list()  // Promise<RoleData[]>
platform.auth.role.delete({ name })  // Promise<void>
```

Auth tables (`user`, `session`, `account`, `verification`) follow better-auth's adapter pattern. They use `text("id").primaryKey()` without a default (better-auth manages ID generation), unlike other tables which use `gen_random_uuid()::text`. Auth tables are **exempt** from `tenant_id` columns and RLS — they live only on the control-plane DB. `AuthUnit` always uses `DatabaseUnit.controlPlaneDb`.

**Event Map** (`AuthEventMap`): 9 events -- `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:unassigned`, `role:created`, `role:deleted`. Published via PubSub as plain string topics.

### LogUnit

Provides structured logging with buffered writes to a Postgres `logs` table. Log entries include optional `traceId`/`spanId` fields (populated from metadata if provided).

```ts
interface LogConfig {
  defaultLevel?: LogLevel  // default: "info"
  serviceName?: string    // default: "app"
}

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"
```

Logs are buffered in memory (capacity: 100 entries) and flushed to Postgres every 5 seconds. `$cleanup()` drains the buffer to ensure no logs are lost.

```ts
platform.logs.debug(message: string, metadata?: Record<string, unknown>): void
platform.logs.info(message: string, metadata?: Record<string, unknown>): void
platform.logs.warn(message: string, metadata?: Record<string, unknown>): void
platform.logs.error(message: string, error?: Error, metadata?: Record<string, unknown>): void
platform.logs.fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void

platform.logs.child(context: Record<string, unknown>): ChildLogger

platform.logs.query(filter: LogQuery): Promise<LogEntry[]>
platform.logs.getStats(service?, startTime?, endTime?): Promise<LogStats>
```

### PubSubUnit

Backed by [pg-boss](https://github.com/timgit/pg-boss) for topic-based publish/subscribe over Postgres.

```ts
interface PubSubConfig {
  monitorStateIntervalSeconds?: number  // default: 30
  schema?: string                        // pg-boss schema
}
```

PubSub creates its **own** pg connection pool from `DatabaseUnit.config` -- it does not reuse the DatabaseUnit's pool. In isolated mode, per-tenant pg-boss instances are created lazily and routed by context `tenantId`. Use `publishControlPlane()` for control-plane events (e.g., auth events).

```ts
platform.pubsub.publish<T>(topic: string, data: T, options?: PublishOptions): Promise<string>
platform.pubsub.publishControlPlane<T>(topic: string, data: T, options?: PublishOptions): Promise<string>
platform.pubsub.publishBatch<T>(topic: string, messages: { data: T; options?: PublishOptions }[]): Promise<string[]>
platform.pubsub.subscribe<T>(topic: string, handler: MessageHandler<T>): Promise<void>
platform.pubsub.unsubscribe(topic: string): Promise<void>

// Cron scheduling
platform.pubsub.schedule(topic: string, cron: string, data?: unknown, options?: ScheduleOptions): Promise<void>
platform.pubsub.unschedule(topic: string): Promise<void>
platform.pubsub.getSchedules(): Promise<unknown[]>

// Queue management
platform.pubsub.getQueueSize(topic: string): Promise<number>
platform.pubsub.purgeQueue(topic: string): Promise<void>
```

### StorageUnit

S3-compatible object storage with Postgres metadata tracking.

```ts
interface StorageConfig {
  bucket: string
  prefix?: string
  provider: StorageProvider
}

interface StorageProvider {
  type: "s3"
  endpoint: string
  region: string
  credentials: { accessKeyId: string; secretAccessKey: string }
  forcePathStyle: boolean
}
```

```ts
platform.storage.upload(input: FileUploadInput): Promise<FileObject>
platform.storage.get(key: string): Promise<Buffer>
platform.storage.remove(key: string): Promise<void>
platform.storage.exists(key: string): Promise<boolean>
platform.storage.getMetadata(key: string): Promise<FileObject>
platform.storage.copy(sourceKey: string, destinationKey: string): Promise<FileObject>
platform.storage.move(sourceKey: string, destinationKey: string): Promise<FileObject>
platform.storage.archive(key: string, archiveKey?: string): Promise<FileObject>
platform.storage.getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string>
platform.storage.getSignedPutUrl(key: string, options?: SignedUrlOptions): Promise<string>
platform.storage.list(prefix?: string, options?: ListOptions): Promise<{ files: FileObject[]; nextContinuationToken?: string }>
```

The `archive()` method copies the file to an archive prefix, removes the original, and marks the metadata record as archived.

### RpcUnit

Type-safe API layer via [oRPC](https://orpc.unnoq.com).

```ts
interface RpcConfig {
  prefix?: string  // default: "/api/rpc"
}
```

The constructor accepts `{ auth, db, logs, pubsub }` but does not use them at construction time. The `RpcContext` (`{ db, pubsub, tenantId? }`) is passed at request time via `handle()`.

```ts
platform.rpc.handle(request: Request, context: RpcContext): Promise<{ matched: boolean; response: Response | undefined }>
platform.rpc.router  // oRPC router object
```

Built-in procedures:
- `echo` -- input: `{ message: string }`, returns `{ echo: string }`
- `health.check` -- returns `{ status: "ok" }`

Procedures use `zod` for input validation.

### KvStoreUnit

Redis-like key-value API over a Postgres table with TTL support.

```ts
interface KvStoreConfig {
  defaultTtl?: number    // default: 3600 (seconds)
  keyPrefix?: string     // default: "" (no prefix)
}
```

```ts
platform.kvStore.get<T>(key: string): Promise<T | null>
platform.kvStore.set(key: string, value: unknown, ttl?: number): Promise<void>
platform.kvStore.del(key: string): Promise<void>
platform.kvStore.exists(key: string): Promise<boolean>
platform.kvStore.increment(key: string, amount?: number): Promise<number>
platform.kvStore.decrement(key: string, amount?: number): Promise<number>
platform.kvStore.getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>
platform.kvStore.clear(pattern?: string): Promise<void>
```

Key behaviors:
- **Lazy TTL eviction**: `get()` checks `expiresAt` and deletes expired entries, returning `null`.
- **TTL of 0 or negative** means no expiration.
- **Serialization**: Strings stored as-is; non-strings JSON-serialized. `get()` attempts JSON parse, falls back to raw string.
- **Key prefixing**: If `keyPrefix` is set, all keys are prefixed as `${prefix}:${key}`.
- **`clear(pattern)`**: Glob `*` to SQL `%` and `?` to `_` for `LIKE` matching.

## Client Platform

The client framework (`@aspen-os/platform/client`) is for browser-side use with 3 units:

| Unit | Description |
|---|---|
| `AuthUnit` | Wraps `createAuthClient()` (better-auth React client) with plugins: `adminClient`, `usernameClient`, `passkeyClient`, `emailOTPClient`, `phoneNumberClient`, `organizationClient`, `apiKeyClient` |
| `LogUnit` | Stub -- throws on `prepare()`/`destroy()` |
| `RpcUnit` | Stub -- no-op |

No `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, or `KvStoreUnit` on the client. The client `Platform` has a `run(fn)` method that sets context (not AsyncLocalStorage — uses a module-level variable).

```ts
import { Framework } from "@aspen-os/platform/client"
import { createAccessControl } from "@aspen-os/platform/client"

const access_control = createAccessControl({
  organization: ["create", "read", "update", "delete"],
  branch: ["create", "read", "update", "delete"],
})

const clientFramework = Framework.create({
  auth: { access_control, baseURL: "...", roles },
  logs: {},
  rpc: {},
})
```

## CLI

The `aspen` CLI is exposed as a bin entry:

```bash
aspen db-studio --config=src/aspen/server.ts [--port=4983] [--host=0.0.0.0] [--tenant=tenant_123]
aspen tenants --config=src/aspen/server.ts
```

Dynamically imports the platform config file, reads the database config and schemas, and launches Drizzle Kit Studio for visual database management. In isolated mode, `--tenant` launches Studio against a per-tenant database. The `tenants` command lists all tenant IDs.

## Writing a Domain Module

Modules follow a strict pattern:

```ts
import type { DatabaseUnit, PubSubUnit } from "@aspen-os/platform/server"

export class XxxModule {
  static create(config: XxxModuleConfig): XxxModule {
    return new XxxModule(config)
  }

  constructor(private config: XxxModuleConfig) {}

  readonly db_schema = dbSchema
  readonly $name = "xxx"

  #workflow: XxxWorkflow | null = null

  get workflow(): XxxWorkflow {
    if (!this.#workflow) throw notInitialized()
    return this.#workflow
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#workflow = new XxxWorkflow(units.db.db)
  }

  async $prepare(): Promise<void> {
    // push schema, register pubsub handlers/schedules
  }

  async $cleanup(): Promise<void> {
    // unregister handlers, null out private fields
    this.#workflow = null
  }
}

function notInitialized(): Error {
  return new Error("Xxx module not initialized. Call $initialize() after platform.create().")
}
```

Key conventions:
- Static `create(config)` factory -- the only constructor pattern.
- Private workflow fields with `#` prefix, initialized lazily in `$initialize(units)`.
- Getter properties that throw `notInitialized()` if accessed before `$initialize()`.
- `db_schema` export (the drizzle schema namespace).
- `$name` as a readonly string (kebab-case or camelCase).
- `prepare()` for schema push and handler/schedule registration.
- `destroy()` nulls out private fields and unregisters handlers.

## Access Control

`createAccessControl` is re-exported from `@aspen-os/platform/client` (originally from `better-auth/plugins/access`):

```ts
import { createAccessControl } from "@aspen-os/platform/client"

const access_control = createAccessControl({
  organization: ["create", "read", "update", "delete"],
  branch: ["create", "read", "update", "delete"],
  file: ["create", "read", "delete"],
})

const roles = {
  admin: access_control.newRole({
    organization: ["create", "read", "update", "delete"],
    branch: ["create", "read", "update", "delete"],
  }),
  viewer: access_control.newRole({
    organization: ["read"],
    branch: ["read"],
  }),
}
```

On the server side, `access_control` and `roles` from `AuthConfig` are passed to the better-auth `admin()` plugin. Access control **enforcement** (checking permissions before performing operations) is not built into the platform's workflows -- it must be done at the application level (e.g., in RPC procedure middleware).

## Type Reference

### Server types (`@aspen-os/platform/server`)

| Type | Description |
|---|---|
| `Platform<M>` | The Platform class |
| `PlatformInstance<M>` | Proxy-wrapped instance with unit + module accessors |
| `PlatformConfig` | Config for all 7 required units |
| `PlatformUnits` | Map of unit name to unit instance |
| `Unit` | Server unit interface (`$name`, `$prepare`, `$cleanup`) |
| `Module<N>` | Module interface (`$name`, `$initialize`, `$prepare`, `$prepareTenant`, `$cleanup`) |
| `DatabaseConfig` | DB connection parameters |
| `TenancyConfig` | Tenancy mode configuration (`single`, `shared`, `isolated`) |
| `TenancyMode` | `"single" \\| "shared" \\| "isolated"` |
| `TenantResolver` | Per-tenant DB config resolver (`resolve`, `list`) |
| `AuthConfig` | Auth configuration |
| `LogConfig` | Log configuration |
| `PubSubConfig` | PubSub configuration |
| `StorageConfig` | Storage configuration |
| `RpcConfig` | RPC configuration |
| `KvStoreConfig` | KV store configuration |

### Client types (`@aspen-os/platform/client`)

| Type | Description |
|---|---|
| `Framework<M>` | Client Framework class (3 units) |
| `PlatformConfig` | Config for auth, logs, rpc |
| `PlatformInstance` | Proxy-wrapped instance with unit + module accessors |
| `PlatformUnits` | Map of unit name to unit instance |
| `Unit` | Client unit interface (same `# @aspen-os/platform

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Tenancy](#tenancy)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Platform Lifecycle](#framework-lifecycle)
- [Server Platform](#server-framework)
  - [PlatformConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Platform](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The platform is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/platform/server` | Node/Bun |
| Client | `@aspen-os/platform/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/platform/server` or `@aspen-os/platform/client` explicitly.

## Installation

```bash
bun install
```

The platform is an internal workspace package (`workspace:*`). It can be published to npm via `bun run publish` (runs build then `bun publish`).

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
    tenancy: { mode: "single" },
  },
  { organization },
)

await platform.prepare()

await platform.run(async () => {
  // AsyncLocalStorage context provides { auth, db, pubsub, tenantId? }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await platform.destroy()
```

## Tenancy

The platform supports three tenancy architectures as a **config-time choice**. The developer picks one mode in `PlatformConfig.tenancy` and commits to it for the application's lifetime. The same module code works transparently across all three modes.

| Mode | Databases | Isolation | Connection routing |
|---|---|---|---|
| **Single Tenant** | 1 | None needed | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Per-tenant pool resolution |

```ts
// Single tenant
tenancy: { mode: "single" }

// Shared DB with Row-Level Security
tenancy: { mode: "shared" }

// Isolated database per tenant
tenancy: {
  mode: "isolated",
  resolver: {
    resolve: async (tenantId) => ({ /* DatabaseConfig */ }),
    list: async () => ["tenant_1", "tenant_2"],
  },
}
```

### `run()` Signatures

```ts
// Single-tenant mode
await platform.run(async () => { /* db resolves to control-plane */ });

// Multi-tenant modes
await platform.run(tenantId, async () => { /* db resolves per-request/per-tenant */ });
```

### Key Design Points

- **Stable DB wrapper** — `DatabaseUnit.db` is a getter returning a Proxy that resolves the correct drizzle instance per-request via `AsyncLocalStorage`. Workflows keep `this.db = units.db.db` — no workflow code changes.
- **Control-plane connection always** — `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.
- **`tenant_id` column always present** — Every table (except auth) gains `tenant_id` with `DEFAULT COALESCE(current_setting('app.tenant_id', true), 'default')`. Avoids conditional schema definitions.
- **RLS via post-push SQL** — In shared mode, the platform discovers all tables with `tenant_id` and applies RLS policies after `pushSchema()` during `prepare()`.
- **Per-tenant PubSub** — In isolated mode, each tenant DB has its own pg-boss. `PubSubUnit` routes based on context `tenantId`.
- **`$prepareTenant(tenantId)`** — New optional `Module` lifecycle method. Called per-tenant in isolated mode for cron/subscription registration.

## Package Exports

```json
{
  "exports": {
    "./client": {
      "default": "./.output/client/index.js",
      "types": "./.output/client/index.d.ts"
    },
    "./server": {
      "default": "./.output/server/index.js",
      "types": "./.output/server/index.d.ts"
    }
  },
  "bin": { "aspen": "./.output/cli/index.js" }
}
```

The platform has a **build step** (`bun run build` in `packages/framework` runs `../../scripts/build.ts` → emits `.output/`). Published `exports` and `bin` point at compiled JS + `.d.ts`. A `build` field in `package.json` maps the same keys to source `.ts` so in-workspace dev resolves to source with no build (Bun feature). Domain modules have no build step — their `exports` point at raw `.ts`.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $cleanup(): Promise<void>
  $prepare?(): Promise<void>
}
```

Server units use the `# @aspen-os/platform

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Tenancy](#tenancy)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Platform Lifecycle](#framework-lifecycle)
- [Server Platform](#server-framework)
  - [PlatformConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Platform](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The platform is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/platform/server` | Node/Bun |
| Client | `@aspen-os/platform/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/platform/server` or `@aspen-os/platform/client` explicitly.

## Installation

```bash
bun install
```

The platform is an internal workspace package (`workspace:*`). It can be published to npm via `bun run publish` (runs build then `bun publish`).

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
    tenancy: { mode: "single" },
  },
  { organization },
)

await platform.prepare()

await platform.run(async () => {
  // AsyncLocalStorage context provides { auth, db, pubsub, tenantId? }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await platform.destroy()
```

## Tenancy

The platform supports three tenancy architectures as a **config-time choice**. The developer picks one mode in `PlatformConfig.tenancy` and commits to it for the application's lifetime. The same module code works transparently across all three modes.

| Mode | Databases | Isolation | Connection routing |
|---|---|---|---|
| **Single Tenant** | 1 | None needed | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Per-tenant pool resolution |

```ts
// Single tenant
tenancy: { mode: "single" }

// Shared DB with Row-Level Security
tenancy: { mode: "shared" }

// Isolated database per tenant
tenancy: {
  mode: "isolated",
  resolver: {
    resolve: async (tenantId) => ({ /* DatabaseConfig */ }),
    list: async () => ["tenant_1", "tenant_2"],
  },
}
```

### `run()` Signatures

```ts
// Single-tenant mode
await platform.run(async () => { /* db resolves to control-plane */ });

// Multi-tenant modes
await platform.run(tenantId, async () => { /* db resolves per-request/per-tenant */ });
```

### Key Design Points

- **Stable DB wrapper** — `DatabaseUnit.db` is a getter returning a Proxy that resolves the correct drizzle instance per-request via `AsyncLocalStorage`. Workflows keep `this.db = units.db.db` — no workflow code changes.
- **Control-plane connection always** — `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.
- **`tenant_id` column always present** — Every table (except auth) gains `tenant_id` with `DEFAULT COALESCE(current_setting('app.tenant_id', true), 'default')`. Avoids conditional schema definitions.
- **RLS via post-push SQL** — In shared mode, the platform discovers all tables with `tenant_id` and applies RLS policies after `pushSchema()` during `prepare()`.
- **Per-tenant PubSub** — In isolated mode, each tenant DB has its own pg-boss. `PubSubUnit` routes based on context `tenantId`.
- **`$prepareTenant(tenantId)`** — New optional `Module` lifecycle method. Called per-tenant in isolated mode for cron/subscription registration.

## Package Exports

```json
{
  "exports": {
    "./client": {
      "default": "./.output/client/index.js",
      "types": "./.output/client/index.d.ts"
    },
    "./server": {
      "default": "./.output/server/index.js",
      "types": "./.output/server/index.d.ts"
    }
  },
  "bin": { "aspen": "./.output/cli/index.js" }
}
```

The platform has a **build step** (`bun run build` in `packages/framework` runs `../../scripts/build.ts` → emits `.output/`). Published `exports` and `bin` point at compiled JS + `.d.ts`. A `build` field in `package.json` maps the same keys to source `.ts` so in-workspace dev resolves to source with no build (Bun feature). Domain modules have no build step — their `exports` point at raw `.ts`.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $cleanup(): Promise<void>
  $prepare?(): Promise<void>
}
```

 prefix for lifecycle methods (`$name`, `$prepare`, `$cleanup`) to avoid collisions with the unit's own public API. Client units use the same `# @aspen-os/platform

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Tenancy](#tenancy)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Platform Lifecycle](#framework-lifecycle)
- [Server Platform](#server-framework)
  - [PlatformConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Platform](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The platform is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/platform/server` | Node/Bun |
| Client | `@aspen-os/platform/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/platform/server` or `@aspen-os/platform/client` explicitly.

## Installation

```bash
bun install
```

The platform is an internal workspace package (`workspace:*`). It can be published to npm via `bun run publish` (runs build then `bun publish`).

## Quick Start

```ts
import { Platform } from "@aspen-os/platform/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const platform = Platform.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
    tenancy: { mode: "single" },
  },
  { organization },
)

await platform.prepare()

await platform.run(async () => {
  // AsyncLocalStorage context provides { auth, db, pubsub, tenantId? }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await platform.destroy()
```

## Tenancy

The platform supports three tenancy architectures as a **config-time choice**. The developer picks one mode in `PlatformConfig.tenancy` and commits to it for the application's lifetime. The same module code works transparently across all three modes.

| Mode | Databases | Isolation | Connection routing |
|---|---|---|---|
| **Single Tenant** | 1 | None needed | Static pool |
| **Shared DB + RLS** | 1 (shared) | Postgres RLS policies | Per-request client + `SET LOCAL` |
| **Isolated DB** | N+1 (control-plane + per-tenant) | Physical (separate DBs) | Per-tenant pool resolution |

```ts
// Single tenant
tenancy: { mode: "single" }

// Shared DB with Row-Level Security
tenancy: { mode: "shared" }

// Isolated database per tenant
tenancy: {
  mode: "isolated",
  resolver: {
    resolve: async (tenantId) => ({ /* DatabaseConfig */ }),
    list: async () => ["tenant_1", "tenant_2"],
  },
}
```

### `run()` Signatures

```ts
// Single-tenant mode
await platform.run(async () => { /* db resolves to control-plane */ });

// Multi-tenant modes
await platform.run(tenantId, async () => { /* db resolves per-request/per-tenant */ });
```

### Key Design Points

- **Stable DB wrapper** — `DatabaseUnit.db` is a getter returning a Proxy that resolves the correct drizzle instance per-request via `AsyncLocalStorage`. Workflows keep `this.db = units.db.db` — no workflow code changes.
- **Control-plane connection always** — `DatabaseUnit` always holds a control-plane pool. `AuthUnit` always uses `controlPlaneDb`. Auth tables are exempt from `tenant_id` and RLS.
- **`tenant_id` column always present** — Every table (except auth) gains `tenant_id` with `DEFAULT COALESCE(current_setting('app.tenant_id', true), 'default')`. Avoids conditional schema definitions.
- **RLS via post-push SQL** — In shared mode, the platform discovers all tables with `tenant_id` and applies RLS policies after `pushSchema()` during `prepare()`.
- **Per-tenant PubSub** — In isolated mode, each tenant DB has its own pg-boss. `PubSubUnit` routes based on context `tenantId`.
- **`$prepareTenant(tenantId)`** — New optional `Module` lifecycle method. Called per-tenant in isolated mode for cron/subscription registration.

## Package Exports

```json
{
  "exports": {
    "./client": {
      "default": "./.output/client/index.js",
      "types": "./.output/client/index.d.ts"
    },
    "./server": {
      "default": "./.output/server/index.js",
      "types": "./.output/server/index.d.ts"
    }
  },
  "bin": { "aspen": "./.output/cli/index.js" }
}
```

The platform has a **build step** (`bun run build` in `packages/framework` runs `../../scripts/build.ts` → emits `.output/`). Published `exports` and `bin` point at compiled JS + `.d.ts`. A `build` field in `package.json` maps the same keys to source `.ts` so in-workspace dev resolves to source with no build (Bun feature). Domain modules have no build step — their `exports` point at raw `.ts`.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $cleanup(): Promise<void>
  $prepare?(): Promise<void>
}
```

 prefix — both interfaces are identical.

Seven core units are required: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`.

### Modules

A **Module** is a business logic plugin. The `Module` interface:

```ts
interface Module<N extends string = string> {
  readonly $name: N
  $initialize?(units: Record<string, Unit>): void
  $prepare?(): Promise<void>
  $prepareTenant?(tenantId: string): Promise<void>  // isolated mode
  $cleanup(): Promise<void>
}
```

Modules are passed as a named object to `Platform.create()`. Module `$name`s become proxy keys: `platform.organization` returns the module instance.

### Platform Lifecycle

```
Platform.create(config, modules)
    --> validates tenancy config
    --> instantiates 7 units (dependency-injected via constructor)
    --> cross-wires pubsub <-> auth
    --> calls module.$initialize(units) for each module
    --> returns proxy-wrapped PlatformInstance

platform.prepare()
    --> unit.$prepare() for each unit (DatabaseUnit pushes core schemas)
    --> module.$prepare() for each module (modules push domain schemas, register pubsub handlers)
    --> shared: applyRlsPolicies() to all tables with tenant_id
    --> isolated: $prepareTenant(tenantId) for each tenant + each module

platform.run(fn)
    --> executes fn inside AsyncLocalStorage providing { auth, db, pubsub, tenantId? }

platform.run(tenantId, fn)   --> multi-tenant: per-request db + tenantId in context

platform.destroy()
    --> module.$cleanup() for each module
    --> unit.$cleanup() for each unit
```

`prepare()` and `destroy()` catch and log errors per-unit/module/tenant. They do not throw on individual failures.

## Server Platform

### PlatformConfig

All seven units are required:

```ts
type PlatformConfig = {
  auth: AuthConfig
  db: DatabaseConfig
  kvStore: KvStoreConfig
  logs: LogConfig
  pubsub: PubSubConfig
  rpc: RpcConfig
  storage: StorageConfig
  tenancy: TenancyConfig
}
```

All seven units are required, plus a `tenancy` config that selects the tenancy mode.

### The Seven Core Units

Units are instantiated in dependency order inside `Platform.create()`:

| Unit | Class | Injected Deps | $name |
|---|---|---|---|
| `db` | `DatabaseUnit` | -- | `"db"` |
| `logs` | `LogUnit` | `{ db }` | `"logs"` |
| `pubsub` | `PubSubUnit` | `{ db }` | `"pubsub"` |
| `auth` | `AuthUnit` | `{ db }` | `"auth"` |
| `storage` | `StorageUnit` | `{ db }` | `"storage"` |
| `kvStore` | `KvStoreUnit` | `{ db }` | `"kvStore"` |
| `rpc` | `RpcUnit` | `{ auth, db, logs, pubsub }` | `"rpc"` |

### DatabaseUnit

Owns a control-plane `pg.Pool` and a drizzle `NodePgDatabase` instance. In isolated mode, also manages per-tenant pools.

```ts
type DatabaseConfig = {
  database: string
  host: string
  port: number
  user: string
  password: string
  ssl?: boolean
  maxConnections?: number  // default: 20
}
```

The `db` config is always the **control-plane** database. In single/RLS mode, this IS the app database. In isolated mode, this is the control-plane database; per-tenant DBs are resolved by the `TenantResolver`.

`$prepare()` uses `pushSchema()` from `drizzle-kit/api` to apply core schemas (auth, logs, storage, kv-store). In shared mode, RLS policies are applied after all schemas are pushed.

`getSchemas()` returns the merged schema object for all core unit tables.

```ts
// Access
platform.db.db               // stable wrapper (Proxy) — resolves per-request via AsyncLocalStorage
platform.db.controlPlaneDb    // drizzle NodePgDatabase — control-plane connection
platform.db.pool              // pg.Pool — control-plane connection pool
platform.db.config            // DatabaseConfig
platform.db.tenancyMode       // "single" | "shared" | "isolated"
platform.db.getSchemas()      // merged core schemas

// Per-tenant (isolated mode)
platform.db.getTenantDb(tenantId)                    // Promise<NodePgDatabase>
platform.db.pushSchemasToTenant(tenantId, schemas)   // provisioning
```

### AuthUnit

Wraps [better-auth](https://www.better-auth.com) with plugins: `admin`, `username`, `organization`, `phoneNumber`, `emailOTP`, `apiKey`, `lastLoginMethod`, `twoFactor`, `passkey`, `captcha` (Cloudflare Turnstile, conditional on `cfSecretKey`).

```ts
interface AuthConfig {
  access_control: ReturnType<typeof createAccessControl>
  baseURL: string
  secret: string
  cfSecretKey?: string
  session: { expiresIn?: number }
  roles: Record<string, Role>
  socialProviders?: {
    google?: { clientId: string; clientSecret: string; redirectURI?: string }
  }
}
```

The public API (accessed via `platform.auth`):

```ts
// Raw betterAuth Auth instance
platform.auth.auth

// HTTP handler for auth routes
platform.auth.fetch_handler(request: Request): Promise<Response>

// User workflows
platform.auth.user.create({ email, name?, password })  // Promise<User>
platform.auth.user.get({ id }) | platform.auth.user.get({ email })  // Promise<User | null>
platform.auth.user.update({ id, data })  // Promise<User>
platform.auth.user.delete({ id })  // Promise<void>
platform.auth.user.role.assign({ userId, roleName })  // Promise<void>
platform.auth.user.role.unassign({ userId })  // Promise<void>

// Session workflows
platform.auth.session.create({ email, password })  // Promise<{ user, session }>
platform.auth.session.validate({ token })  // Promise<{ user, session } | null>
platform.auth.session.invalidate({ sessionId })  // Promise<void>

// Role workflows
platform.auth.role.list()  // Promise<RoleData[]>
platform.auth.role.delete({ name })  // Promise<void>
```

Auth tables (`user`, `session`, `account`, `verification`) follow better-auth's adapter pattern. They use `text("id").primaryKey()` without a default (better-auth manages ID generation), unlike other tables which use `gen_random_uuid()::text`. Auth tables are **exempt** from `tenant_id` columns and RLS — they live only on the control-plane DB. `AuthUnit` always uses `DatabaseUnit.controlPlaneDb`.

**Event Map** (`AuthEventMap`): 9 events -- `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:unassigned`, `role:created`, `role:deleted`. Published via PubSub as plain string topics.

### LogUnit

Provides structured logging with buffered writes to a Postgres `logs` table. Log entries include optional `traceId`/`spanId` fields (populated from metadata if provided).

```ts
interface LogConfig {
  defaultLevel?: LogLevel  // default: "info"
  serviceName?: string    // default: "app"
}

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"
```

Logs are buffered in memory (capacity: 100 entries) and flushed to Postgres every 5 seconds. `$cleanup()` drains the buffer to ensure no logs are lost.

```ts
platform.logs.debug(message: string, metadata?: Record<string, unknown>): void
platform.logs.info(message: string, metadata?: Record<string, unknown>): void
platform.logs.warn(message: string, metadata?: Record<string, unknown>): void
platform.logs.error(message: string, error?: Error, metadata?: Record<string, unknown>): void
platform.logs.fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void

platform.logs.child(context: Record<string, unknown>): ChildLogger

platform.logs.query(filter: LogQuery): Promise<LogEntry[]>
platform.logs.getStats(service?, startTime?, endTime?): Promise<LogStats>
```

### PubSubUnit

Backed by [pg-boss](https://github.com/timgit/pg-boss) for topic-based publish/subscribe over Postgres.

```ts
interface PubSubConfig {
  monitorStateIntervalSeconds?: number  // default: 30
  schema?: string                        // pg-boss schema
}
```

PubSub creates its **own** pg connection pool from `DatabaseUnit.config` -- it does not reuse the DatabaseUnit's pool. In isolated mode, per-tenant pg-boss instances are created lazily and routed by context `tenantId`. Use `publishControlPlane()` for control-plane events (e.g., auth events).

```ts
platform.pubsub.publish<T>(topic: string, data: T, options?: PublishOptions): Promise<string>
platform.pubsub.publishControlPlane<T>(topic: string, data: T, options?: PublishOptions): Promise<string>
platform.pubsub.publishBatch<T>(topic: string, messages: { data: T; options?: PublishOptions }[]): Promise<string[]>
platform.pubsub.subscribe<T>(topic: string, handler: MessageHandler<T>): Promise<void>
platform.pubsub.unsubscribe(topic: string): Promise<void>

// Cron scheduling
platform.pubsub.schedule(topic: string, cron: string, data?: unknown, options?: ScheduleOptions): Promise<void>
platform.pubsub.unschedule(topic: string): Promise<void>
platform.pubsub.getSchedules(): Promise<unknown[]>

// Queue management
platform.pubsub.getQueueSize(topic: string): Promise<number>
platform.pubsub.purgeQueue(topic: string): Promise<void>
```

### StorageUnit

S3-compatible object storage with Postgres metadata tracking.

```ts
interface StorageConfig {
  bucket: string
  prefix?: string
  provider: StorageProvider
}

interface StorageProvider {
  type: "s3"
  endpoint: string
  region: string
  credentials: { accessKeyId: string; secretAccessKey: string }
  forcePathStyle: boolean
}
```

```ts
platform.storage.upload(input: FileUploadInput): Promise<FileObject>
platform.storage.get(key: string): Promise<Buffer>
platform.storage.remove(key: string): Promise<void>
platform.storage.exists(key: string): Promise<boolean>
platform.storage.getMetadata(key: string): Promise<FileObject>
platform.storage.copy(sourceKey: string, destinationKey: string): Promise<FileObject>
platform.storage.move(sourceKey: string, destinationKey: string): Promise<FileObject>
platform.storage.archive(key: string, archiveKey?: string): Promise<FileObject>
platform.storage.getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string>
platform.storage.getSignedPutUrl(key: string, options?: SignedUrlOptions): Promise<string>
platform.storage.list(prefix?: string, options?: ListOptions): Promise<{ files: FileObject[]; nextContinuationToken?: string }>
```

The `archive()` method copies the file to an archive prefix, removes the original, and marks the metadata record as archived.

### RpcUnit

Type-safe API layer via [oRPC](https://orpc.unnoq.com).

```ts
interface RpcConfig {
  prefix?: string  // default: "/api/rpc"
}
```

The constructor accepts `{ auth, db, logs, pubsub }` but does not use them at construction time. The `RpcContext` (`{ db, pubsub, tenantId? }`) is passed at request time via `handle()`.

```ts
platform.rpc.handle(request: Request, context: RpcContext): Promise<{ matched: boolean; response: Response | undefined }>
platform.rpc.router  // oRPC router object
```

Built-in procedures:
- `echo` -- input: `{ message: string }`, returns `{ echo: string }`
- `health.check` -- returns `{ status: "ok" }`

Procedures use `zod` for input validation.

### KvStoreUnit

Redis-like key-value API over a Postgres table with TTL support.

```ts
interface KvStoreConfig {
  defaultTtl?: number    // default: 3600 (seconds)
  keyPrefix?: string     // default: "" (no prefix)
}
```

```ts
platform.kvStore.get<T>(key: string): Promise<T | null>
platform.kvStore.set(key: string, value: unknown, ttl?: number): Promise<void>
platform.kvStore.del(key: string): Promise<void>
platform.kvStore.exists(key: string): Promise<boolean>
platform.kvStore.increment(key: string, amount?: number): Promise<number>
platform.kvStore.decrement(key: string, amount?: number): Promise<number>
platform.kvStore.getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>
platform.kvStore.clear(pattern?: string): Promise<void>
```

Key behaviors:
- **Lazy TTL eviction**: `get()` checks `expiresAt` and deletes expired entries, returning `null`.
- **TTL of 0 or negative** means no expiration.
- **Serialization**: Strings stored as-is; non-strings JSON-serialized. `get()` attempts JSON parse, falls back to raw string.
- **Key prefixing**: If `keyPrefix` is set, all keys are prefixed as `${prefix}:${key}`.
- **`clear(pattern)`**: Glob `*` to SQL `%` and `?` to `_` for `LIKE` matching.

## Client Platform

The client framework (`@aspen-os/platform/client`) is for browser-side use with 3 units:

| Unit | Description |
|---|---|
| `AuthUnit` | Wraps `createAuthClient()` (better-auth React client) with plugins: `adminClient`, `usernameClient`, `passkeyClient`, `emailOTPClient`, `phoneNumberClient`, `organizationClient`, `apiKeyClient` |
| `LogUnit` | Stub -- throws on `prepare()`/`destroy()` |
| `RpcUnit` | Stub -- no-op |

No `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, or `KvStoreUnit` on the client. The client `Platform` has a `run(fn)` method that sets context (not AsyncLocalStorage — uses a module-level variable).

```ts
import { Framework } from "@aspen-os/platform/client"
import { createAccessControl } from "@aspen-os/platform/client"

const access_control = createAccessControl({
  organization: ["create", "read", "update", "delete"],
  branch: ["create", "read", "update", "delete"],
})

const clientFramework = Framework.create({
  auth: { access_control, baseURL: "...", roles },
  logs: {},
  rpc: {},
})
```

## CLI

The `aspen` CLI is exposed as a bin entry:

```bash
aspen db-studio --config=src/aspen/server.ts [--port=4983] [--host=0.0.0.0] [--tenant=tenant_123]
aspen tenants --config=src/aspen/server.ts
```

Dynamically imports the platform config file, reads the database config and schemas, and launches Drizzle Kit Studio for visual database management. In isolated mode, `--tenant` launches Studio against a per-tenant database. The `tenants` command lists all tenant IDs.

## Writing a Domain Module

Modules follow a strict pattern:

```ts
import type { DatabaseUnit, PubSubUnit } from "@aspen-os/platform/server"

export class XxxModule {
  static create(config: XxxModuleConfig): XxxModule {
    return new XxxModule(config)
  }

  constructor(private config: XxxModuleConfig) {}

  readonly db_schema = dbSchema
  readonly $name = "xxx"

  #workflow: XxxWorkflow | null = null

  get workflow(): XxxWorkflow {
    if (!this.#workflow) throw notInitialized()
    return this.#workflow
  }

  $initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#workflow = new XxxWorkflow(units.db.db)
  }

  async $prepare(): Promise<void> {
    // push schema, register pubsub handlers/schedules
  }

  async $cleanup(): Promise<void> {
    // unregister handlers, null out private fields
    this.#workflow = null
  }
}

function notInitialized(): Error {
  return new Error("Xxx module not initialized. Call $initialize() after platform.create().")
}
```

Key conventions:
- Static `create(config)` factory -- the only constructor pattern.
- Private workflow fields with `#` prefix, initialized lazily in `$initialize(units)`.
- Getter properties that throw `notInitialized()` if accessed before `$initialize()`.
- `db_schema` export (the drizzle schema namespace).
- `$name` as a readonly string (kebab-case or camelCase).
- `prepare()` for schema push and handler/schedule registration.
- `destroy()` nulls out private fields and unregisters handlers.

## Access Control

`createAccessControl` is re-exported from `@aspen-os/platform/client` (originally from `better-auth/plugins/access`):

```ts
import { createAccessControl } from "@aspen-os/platform/client"

const access_control = createAccessControl({
  organization: ["create", "read", "update", "delete"],
  branch: ["create", "read", "update", "delete"],
  file: ["create", "read", "delete"],
})

const roles = {
  admin: access_control.newRole({
    organization: ["create", "read", "update", "delete"],
    branch: ["create", "read", "update", "delete"],
  }),
  viewer: access_control.newRole({
    organization: ["read"],
    branch: ["read"],
  }),
}
```

On the server side, `access_control` and `roles` from `AuthConfig` are passed to the better-auth `admin()` plugin. Access control **enforcement** (checking permissions before performing operations) is not built into the platform's workflows -- it must be done at the application level (e.g., in RPC procedure middleware).

## Type Reference

### Server types (`@aspen-os/platform/server`)

| Type | Description |
|---|---|
| `Platform<M>` | The Platform class |
| `PlatformInstance<M>` | Proxy-wrapped instance with unit + module accessors |
| `PlatformConfig` | Config for all 7 required units |
| `PlatformUnits` | Map of unit name to unit instance |
| `Unit` | Server unit interface (`$name`, `$prepare`, `$cleanup`) |
| `Module<N>` | Module interface (`$name`, `$initialize`, `$prepare`, `$prepareTenant`, `$cleanup`) |
| `DatabaseConfig` | DB connection parameters |
| `TenancyConfig` | Tenancy mode configuration (`single`, `shared`, `isolated`) |
| `TenancyMode` | `"single" \\| "shared" \\| "isolated"` |
| `TenantResolver` | Per-tenant DB config resolver (`resolve`, `list`) |
| `AuthConfig` | Auth configuration |
| `LogConfig` | Log configuration |
| `PubSubConfig` | PubSub configuration |
| `StorageConfig` | Storage configuration |
| `RpcConfig` | RPC configuration |
| `KvStoreConfig` | KV store configuration |

### Client types (`@aspen-os/platform/client`)

 prefix as server) |
| `Module<N>` | Same as server |
| `AuthClient` | better-auth client type |
| `AuthUnit` | Client auth unit (wraps better-auth React client) |
| `LogConfig` | Log configuration (unused on client) |
| `RpcConfig` | RPC configuration (unused on client) |
| `createAccessControl` | Re-exported from `better-auth/plugins/access` |
