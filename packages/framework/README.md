# @aspen-os/framework

A composable business application framework for Bun/TypeScript. Provides seven infrastructure units (database, auth, logging, pub/sub, RPC, storage, KV store) and a module system so domain-specific business logic can be built on top without reinventing plumbing.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Package Exports](#package-exports)
- [Core Concepts](#core-concepts)
  - [Units](#units)
  - [Modules](#modules)
  - [Framework Lifecycle](#framework-lifecycle)
- [Server Framework](#server-framework)
  - [FrameworkConfig](#frameworkconfig)
  - [The Seven Core Units](#the-seven-core-units)
  - [DatabaseUnit](#databaseunit)
  - [AuthUnit](#authunit)
  - [LogUnit](#logunit)
  - [PubSubUnit](#pubsubunit)
  - [StorageUnit](#storageunit)
  - [RpcUnit](#rpcunit)
  - [KvStoreUnit](#kvstoreunit)
- [Client Framework](#client-framework)
- [CLI](#cli)
- [Writing a Domain Module](#writing-a-domain-module)
- [Access Control](#access-control)
- [Type Reference](#type-reference)

## Overview

The framework is split into three entry surfaces:

| Surface | Path | Runtime |
|---|---|---|
| Server | `@aspen-os/framework/server` | Node/Bun |
| Client | `@aspen-os/framework/client` | Browser |
| CLI | `aspen` (bin) | Terminal |

There is no root `.` export. Import from `@aspen-os/framework/server` or `@aspen-os/framework/client` explicitly.

## Installation

```bash
bun install
```

The framework is an internal workspace package (`workspace:*`). It is not published to npm.

## Quick Start

```ts
import { Framework } from "@aspen-os/framework/server"
import { OrganizationModule } from "@aspen-os/organization"

const organization = OrganizationModule.create({ country: "INDIA" })

const framework = Framework.create(
  {
    db: { host: "localhost", port: 5432, user: "recruiter", password: "recruiter", database: "recruiter" },
    auth: { access_control, roles, baseURL: "http://localhost:3000", secret: AUTH_SECRET, session: {}, cfSecretKey: CF_SECRET },
    logs: { serviceName: "recruiter", defaultLevel: "info" },
    pubsub: {},
    rpc: { prefix: "/api/rpc" },
    storage: { bucket: "recruiter", provider: { type: "s3", endpoint: "http://localhost:8333", region: "us-east-1", credentials: { accessKeyId: "...", secretAccessKey: "..." }, forcePathStyle: true } },
    kvStore: { defaultTtl: 3600 },
  },
  { organization },
)

await framework.prepare()

await framework.run(async () => {
  // AsyncLocalStorage context provides { db, pubsub }
  // db: drizzle NodePgDatabase instance
  // pubsub: PubSubUnit instance
})

await framework.destroy()
```

## Package Exports

```json
{
  "exports": {
    "./server": "./src/server/index.ts",
    "./client": "./src/client/index.ts"
  },
  "bin": { "aspen": "./src/cli/index.ts" }
}
```

No build step. Exports point at raw `.ts` files. Bun resolves them directly.

## Core Concepts

### Units

A **Unit** is an infrastructure building block. The server `Unit` interface:

```ts
interface Unit {
  readonly $name: string
  $destroy(): Promise<void>
  $prepare?(): Promise<void>
}
```

Server units use the `$` prefix for lifecycle methods (`$name`, `$prepare`, `$destroy`) to avoid collisions with the unit's own public API. Client units use no prefix (`name`, `prepare`, `destroy`).

Seven core units are required: `db`, `auth`, `logs`, `pubsub`, `rpc`, `storage`, `kvStore`.

### Modules

A **Module** is a business logic plugin. The `Module` interface:

```ts
interface Module<N extends string = string> {
  readonly name: N
  initialize?(units: Record<string, Unit>): void
  prepare?(): Promise<void>
  destroy(): Promise<void>
}
```

Modules are passed as a named object to `Framework.create()`. Module names become proxy keys: `framework.organization` returns the module instance.

### Framework Lifecycle

```
Framework.create(config, modules)
    --> instantiates 7 units (dependency-injected via constructor)
    --> calls module.initialize(units) for each module
    --> returns proxy-wrapped FrameworkInstance

framework.prepare()
    --> unit.$prepare() for each unit (DatabaseUnit pushes core schemas)
    --> module.prepare() for each module (modules push domain schemas, register pubsub handlers)

framework.run(fn)
    --> executes fn inside AsyncLocalStorage providing { db, pubsub }

framework.destroy()
    --> module.destroy() for each module
    --> unit.$destroy() for each unit
```

`prepare()` and `destroy()` catch and log errors per-unit/module. They do not throw on individual failures.

## Server Framework

### FrameworkConfig

All seven units are required:

```ts
type FrameworkConfig = {
  auth: AuthConfig
  db: DatabaseConfig
  kvStore: KvStoreConfig
  logs: LogConfig
  pubsub: PubSubConfig
  rpc: RpcConfig
  storage: StorageConfig
}
```

### The Seven Core Units

Units are instantiated in dependency order inside `Framework.create()`:

| Unit | Class | Injected Deps | $name |
|---|---|---|---|
| `db` | `DatabaseUnit` | -- | `"database"` |
| `logs` | `LogUnit` | `{ db }` | `"logs"` |
| `pubsub` | `PubSubUnit` | `{ db }` | `"pubsub"` |
| `storage` | `StorageUnit` | `{ db }` | `"storage"` |
| `auth` | `AuthUnit` | `{ db }` | `"auth"` |
| `rpc` | `RpcUnit` | `{ auth, db, logs, pubsub }` | `"rpc"` |
| `kvStore` | `KvStoreUnit` | `{ db }` | `"kv-store"` |

### DatabaseUnit

Owns a `pg.Pool` and a drizzle `NodePgDatabase` instance.

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

`$prepare()` uses `pushSchema()` from `drizzle-kit/api` to apply core schemas (auth, logs, storage, kv-store). Data-loss warnings are logged but the push proceeds.

`getSchemas()` returns the merged schema object for all core unit tables.

```ts
// Access
framework.db.db      // drizzle NodePgDatabase instance
framework.db.pool     // pg.Pool instance
framework.db.config   // DatabaseConfig
framework.db.getSchemas()  // merged core schemas
```

### AuthUnit

Wraps [better-auth](https://www.better-auth.com) with plugins: `admin`, `username`, `phoneNumber`, `lastLoginMethod`, `twoFactor`, `passkey`, `captcha` (Cloudflare Turnstile).

```ts
interface AuthConfig {
  access_control: ReturnType<typeof createAccessControl>
  baseURL: string
  secret: string
  cfSecretKey: string
  session: { expiresIn?: number }
  roles: Record<string, Role>
  socialProviders?: {
    google?: { clientId: string; clientSecret: string; redirectURI?: string }
  }
}
```

The public API (accessed via `framework.auth`):

```ts
// Raw betterAuth Auth instance
framework.auth.auth

// HTTP handler for auth routes
framework.auth.fetch_handler(request: Request): Promise<Response>

// User workflows
framework.auth.user.create({ email, name?, password })  // Promise<User>
framework.auth.user.get({ id }) | framework.auth.user.get({ email })  // Promise<User | null>
framework.auth.user.update({ id, data })  // Promise<User>
framework.auth.user.delete({ id })  // Promise<void>
framework.auth.user.role.assign({ userId, roleName })  // Promise<void>
framework.auth.user.role.unassign({ userId })  // Promise<void>

// Session workflows
framework.auth.session.create({ email, password })  // Promise<{ user, session }>
framework.auth.session.validate({ token })  // Promise<{ user, session } | null>
framework.auth.session.invalidate({ sessionId })  // Promise<void>

// Role workflows
framework.auth.role.list()  // Promise<RoleData[]>
framework.auth.role.delete({ name })  // Promise<void>
```

Auth tables (`user`, `session`, `account`, `verification`) follow better-auth's adapter pattern. They use `text("id").primaryKey()` without a default (better-auth manages ID generation), unlike other tables which use `gen_random_uuid()::text`.

**Event Map** (`AuthEventMap`): 9 events -- `user:created`, `user:updated`, `user:deleted`, `session:created`, `session:invalidated`, `role:assigned`, `role:unassigned`, `role:created`, `role:deleted`. Published via PubSub as plain string topics.

### LogUnit

Provides pino-based structured logging with buffered writes to a Postgres `logs` table. Integrates OpenTelemetry span context.

```ts
interface LogConfig {
  defaultLevel?: LogLevel  // default: "info"
  serviceName?: string    // default: "app"
}

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"
```

Logs are buffered in memory (capacity: 100 entries) and flushed to Postgres every 5 seconds. `$destroy()` drains the buffer to ensure no logs are lost.

```ts
framework.logs.debug(message: string, metadata?: Record<string, unknown>): void
framework.logs.info(message: string, metadata?: Record<string, unknown>): void
framework.logs.warn(message: string, metadata?: Record<string, unknown>): void
framework.logs.error(message: string, error?: Error, metadata?: Record<string, unknown>): void
framework.logs.fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void

framework.logs.child(context: Record<string, unknown>): ChildLogger

framework.logs.query(filter: LogQuery): Promise<LogEntry[]>
framework.logs.getStats(service?, startTime?, endTime?): Promise<LogStats>
```

### PubSubUnit

Backed by [pg-boss](https://github.com/timgit/pg-boss) for topic-based publish/subscribe over Postgres.

```ts
interface PubSubConfig {
  monitorStateIntervalSeconds?: number  // default: 30
  schema?: string                        // pg-boss schema
}
```

PubSub creates its **own** pg connection pool from `DatabaseUnit.config` -- it does not reuse the DatabaseUnit's pool.

```ts
framework.pubsub.publish<T>(topic: string, data: T, options?: PublishOptions): Promise<string>
framework.pubsub.publishBatch<T>(topic: string, messages: { data: T; options?: PublishOptions }[]): Promise<string[]>
framework.pubsub.subscribe<T>(topic: string, handler: MessageHandler<T>): Promise<void>
framework.pubsub.unsubscribe(topic: string): Promise<void>

// Cron scheduling
framework.pubsub.schedule(topic: string, cron: string, data?: unknown, options?: ScheduleOptions): Promise<void>
framework.pubsub.unschedule(topic: string): Promise<void>
framework.pubsub.getSchedules(): Promise<unknown[]>

// Queue management
framework.pubsub.getQueueSize(topic: string): Promise<number>
framework.pubsub.purgeQueue(topic: string): Promise<void>
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
framework.storage.upload(input: FileUploadInput): Promise<FileObject>
framework.storage.get(key: string): Promise<Buffer>
framework.storage.remove(key: string): Promise<void>
framework.storage.exists(key: string): Promise<boolean>
framework.storage.getMetadata(key: string): Promise<FileObject>
framework.storage.copy(sourceKey: string, destinationKey: string): Promise<FileObject>
framework.storage.move(sourceKey: string, destinationKey: string): Promise<FileObject>
framework.storage.archive(key: string, archiveKey?: string): Promise<FileObject>
framework.storage.getSignedGetUrl(key: string, options?: SignedUrlOptions): Promise<string>
framework.storage.getSignedPutUrl(key: string, options?: SignedUrlOptions): Promise<string>
framework.storage.list(prefix?: string, options?: ListOptions): Promise<{ files: FileObject[]; nextContinuationToken?: string }>
```

The `archive()` method copies the file to an archive prefix, removes the original, and marks the metadata record as archived.

### RpcUnit

Type-safe API layer via [oRPC](https://orpc.unnoq.com).

```ts
interface RpcConfig {
  prefix?: string  // default: "/api/rpc"
}
```

The constructor accepts `{ auth, db, logs, pubsub }` but does not use them at construction time. The `RpcContext` (`{ db, pubsub }`) is passed at request time via `handle()`.

```ts
framework.rpc.handle(request: Request, context: RpcContext): Promise<{ matched: boolean; response: Response | undefined }>
framework.rpc.router  // oRPC router object
```

Built-in procedures:
- `echo` -- input: `{ message: string }`, returns `{ echo: string }`
- `health.check` -- returns `{ status: "ok" }`

Procedures use `zod/v4` for input validation.

### KvStoreUnit

Redis-like key-value API over a Postgres table with TTL support.

```ts
interface KvStoreConfig {
  defaultTtl?: number    // default: 3600 (seconds)
  keyPrefix?: string     // default: "" (no prefix)
}
```

```ts
framework.kvStore.get<T>(key: string): Promise<T | null>
framework.kvStore.set(key: string, value: unknown, ttl?: number): Promise<void>
framework.kvStore.del(key: string): Promise<void>
framework.kvStore.exists(key: string): Promise<boolean>
framework.kvStore.increment(key: string, amount?: number): Promise<number>
framework.kvStore.decrement(key: string, amount?: number): Promise<number>
framework.kvStore.getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>
framework.kvStore.clear(pattern?: string): Promise<void>
```

Key behaviors:
- **Lazy TTL eviction**: `get()` checks `expiresAt` and deletes expired entries, returning `null`.
- **TTL of 0 or negative** means no expiration.
- **Serialization**: Strings stored as-is; non-strings JSON-serialized. `get()` attempts JSON parse, falls back to raw string.
- **Key prefixing**: If `keyPrefix` is set, all keys are prefixed as `${prefix}:${key}`.
- **`clear(pattern)`**: Glob `*` to SQL `%` and `?` to `_` for `LIKE` matching.

## Client Framework

The client framework (`@aspen-os/framework/client`) is for browser-side use with 3 units:

| Unit | Description |
|---|---|
| `AuthUnit` | Wraps `createAuthClient()` (better-auth React client) with plugins: `adminClient`, `emailOTPClient`, `usernameClient`, `passkeyClient`, `phoneNumberClient` |
| `LogUnit` | Stub -- throws on `prepare()`/`destroy()` |
| `RpcUnit` | Stub -- no-op |

No `DatabaseUnit`, `PubSubUnit`, `StorageUnit`, or `KvStoreUnit` on the client. No `run()` method or `AsyncLocalStorage`.

```ts
import { Framework } from "@aspen-os/framework/client"
import { createAccessControl } from "@aspen-os/framework/client"

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
aspen db-studio --config=src/aspen/server.ts [--port=4983] [--host=0.0.0.0]
```

Dynamically imports the framework config file, reads the database config and schemas, and launches Drizzle Kit Studio for visual database management.

## Writing a Domain Module

Modules follow a strict pattern:

```ts
import type { DatabaseUnit, PubSubUnit } from "@aspen-os/framework/server"

export class XxxModule {
  static create(config: XxxModuleConfig): XxxModule {
    return new XxxModule(config)
  }

  constructor(private config: XxxModuleConfig) {}

  readonly db_schema = dbSchema
  readonly name = "xxx"

  #workflow: XxxWorkflow | null = null

  get workflow(): XxxWorkflow {
    if (!this.#workflow) throw notInitialized()
    return this.#workflow
  }

  initialize(units: { db: DatabaseUnit; pubsub: PubSubUnit }): void {
    this.#workflow = new XxxWorkflow(units.db.db)
  }

  async prepare(): Promise<void> {
    // push schema, register pubsub handlers/schedules
  }

  async destroy(): Promise<void> {
    // unregister handlers, null out private fields
    this.#workflow = null
  }
}

function notInitialized(): Error {
  return new Error("Xxx module not initialized. Call initialize() after framework.initialize().")
}
```

Key conventions:
- Static `create(config)` factory -- the only constructor pattern.
- Private workflow fields with `#` prefix, initialized lazily in `initialize(units)`.
- Getter properties that throw `notInitialized()` if accessed before `initialize()`.
- `db_schema` export (the drizzle schema namespace).
- `name` as kebab-case readonly string.
- `prepare()` for schema push and handler/schedule registration.
- `destroy()` nulls out private fields and unregisters handlers.

## Access Control

`createAccessControl` is re-exported from `@aspen-os/framework/client` (originally from `better-auth/plugins/access`):

```ts
import { createAccessControl } from "@aspen-os/framework/client"

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

On the server side, `access_control` and `roles` from `AuthConfig` are passed to the better-auth `admin()` plugin. Access control **enforcement** (checking permissions before performing operations) is not built into the framework's workflows -- it must be done at the application level (e.g., in RPC procedure middleware).

## Type Reference

### Server types (`@aspen-os/framework/server`)

| Type | Description |
|---|---|
| `Framework<M>` | The Framework class |
| `FrameworkInstance<M>` | Proxy-wrapped instance with unit + module accessors |
| `FrameworkConfig` | Config for all 7 required units |
| `FrameworkUnits` | Map of unit name to unit instance |
| `Unit` | Server unit interface (`$name`, `$prepare`, `$destroy`) |
| `Module<N>` | Module interface (`name`, `initialize`, `prepare`, `destroy`) |
| `DatabaseConfig` | DB connection parameters |
| `AuthConfig` | Auth configuration |
| `LogConfig` | Log configuration |
| `LogLevel` | `"debug" \| "info" \| "warn" \| "error" \| "fatal"` |
| `PubSubConfig` | PubSub configuration |
| `PublishOptions` | Retry and delivery configuration |
| `ScheduleOptions` | Cron scheduling options |
| `StorageConfig` | Storage configuration |
| `RpcConfig` | RPC configuration |
| `KvStoreConfig` | KV store configuration |

### Client types (`@aspen-os/framework/client`)

| Type | Description |
|---|---|
| `Framework<M>` | Client Framework class (3 units) |
| `FrameworkConfig` | Config for auth, logs, rpc |
| `Unit` | Client unit interface (no `$` prefix) |
| `Module<N>` | Same as server |
| `AuthClient` | better-auth client type |
