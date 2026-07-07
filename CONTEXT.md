# Aspen OS — Context Map

## Vision

Aspen OS is a **business application framework** built on Bun/TypeScript that provides composable infrastructure (auth, storage, logging, pub/sub, RPC, database) so domain-specific modules (HR, recruiting, analytics, etc.) can be built on top without reinventing plumbing.

The first concrete application built on this framework is **Recruiter** — a recruitment management system.

## Strategic Pattern

**Pluggable Kernel** — a small framework kernel (`Framework` class) orchestrates lifecycle and wiring of infrastructure Units, while business Modules are registered externally and receive typed dependencies.

```
┌─────────────────────────────────────────────────┐
│                  Application Layer               │
│  (recruiter, documentation, future apps)         │
├─────────────────────────────────────────────────┤
│                Domain Modules                    │
│  (hr, analytics, banking, reports — stubs)       │
├─────────────────────────────────────────────────┤
│              Framework Kernel                    │
│  Framework → Units (db, auth, logs, pubsub,      │
│             rpc, storage) + Modules              │
├─────────────────────────────────────────────────┤
│            Infrastructure                        │
│  Postgres, S3, pg-boss, better-auth, oRPC        │
└─────────────────────────────────────────────────┘
```

## Bounded Contexts

### 1. Framework Kernel (Core)
**Role**: Universal infrastructure provider

Owns the lifecycle of all core units and provides dependency injection via constructors. Exposes `AsyncLocalStorage` context for request-scoped access to `db` and `pubsub`.

**Key aggregates**:
- `Framework` — orchestrator, owns `Units` map and `Modules` map
- `Unit` (interface) — `{ name, destroy(), healthCheck() }`
- `Module` (interface) — same shape as Unit, receives richer deps (`ModuleDeps`)

**Ubiquitous language**: Unit, Module, Framework, Initialize, Destroy, HealthCheck, Register

### 2. Authentication & Authorization
**Role**: Identity, sessions, and access control

Built on `better-auth`. Manages users, sessions, roles, and permissions. Exposes both an HTTP handler and programmatic workflows.

**Key aggregates**:
- `AuthUser` — id, email, name, metadata, passwordHash
- `AuthSession` — id, token, userId, expiresAt
- `AuthRole` — id, name, description
- `AuthPermission` — id, resource, action
- `UserRole` (join) — userId ↔ roleId
- `RolePermission` (join) — roleId ↔ permissionId

**Key workflows** (command side):
- `user.create/delete/update/get`
- `user.role.assign/unassign/list`
- `user.permission.check/list`
- `session.create/validate/invalidate`
- `role.list/delete`

**Events** (domain events via event-map):
- `user:created`, `user:updated`, `user:deleted`
- `session:created`, `session:invalidated`
- `role:created`, `role:deleted`, `role:assigned`, `role:unassigned`

**Ubiquitous language**: User, Session, Role, Permission, Grant, Revoke, Authenticate, Authorize

### 3. Access Control Definition
**Role**: Declarative permission model

`createAccessControl` (from better-auth) defines a statement matrix: `{ resource: [actions...] }`. Roles are created via `ac.newRole({...})`.

**In the Recruiter app**, 12 resources and 7 roles are defined:
- Resources: `audit_logs`, `client_contracts`, `clients`, `drafts`, `filter_views`, `job_mandates`, `notification`, `prospects`, `reminders`, `tasks`, `team_members`
- Roles: `admin`, `bd` (business dev), `caller`, `qc` (quality check), `rm` (resource manager), `sc` (sourcing), `tl` (team lead)

**Ubiquitous language**: Statement, Resource, Action, Role Definition, Access Control

### 4. Logging & Observability
**Role**: Structured logging with Postgres persistence

Provides pino-based logging with buffered writes to a `logs` table. Integrates OpenTelemetry span context (traceId, spanId).

**Key aggregates**:
- `LogEntry` — id, level, message, service, timestamp, metadata, error, traceId, spanId, userId, requestId, duration
- `LogStats` — total, byLevel, errorRate

**Key operations**:
- Log at levels: debug, info, warn, error, fatal
- Query logs by filter (level, service, time range, search, traceId)
- Get aggregated stats
- Create child loggers with fixed context

**Ubiquitous language**: Log Entry, Level, Service, Span, Trace, Buffer, Flush, Drain

### 5. Pub/Sub & Messaging
**Role**: Async event bus backed by pg-boss

Provides topic-based publish/subscribe over Postgres (pg-boss job queue).

**Key aggregates**:
- `Message<T>` — id, name, data, createdOn, completedOn
- `PublishOptions` — retryLimit, retryDelay, retryBackoff, priority, expireInMinutes, startAfter

**Key operations**:
- `publish(topic, data)` — enqueue a message
- (Subscription handling via pg-boss workers — internal)

**Ubiquitous language**: Topic, Publish, Subscribe, Message, Handler, Retry, Priority

### 6. File Storage
**Role**: Object storage with metadata tracking

S3-compatible storage with a Postgres metadata table for tracking files.

**Key aggregates**:
- `FileMetadata` — id, key, bucket, contentType, size, etag, metadata, archived, archivedKey, createdAt, updatedAt
- `FileObject` — key, size, etag, lastModified, contentType, metadata
- `FileUploadInput` — key, body, contentType, cacheControl, metadata

**Key operations**:
- Upload, download, delete, list files
- Generate signed URLs (presigned GET/PUT)
- Archive files (soft-delete with key migration)
- Query file metadata

**Ubiquitous language**: File, Bucket, Key, Upload, Download, Archive, Signed URL, ETag

### 7. RPC (Remote Procedure Call)
**Role**: Type-safe API layer via oRPC

Provides a router-based RPC server with middleware support.

**Key aggregates**:
- `RpcRouter` — routes (echo, health.check)
- `RpcContext` — `{ db, pubsub }`

**Built-in procedures**:
- `echo` — echo back input (test/diagnostic)
- `health.check` — system health check

**Ubiquitous language**: Procedure, Router, Handler, Middleware, Context

### 8. Notification (Optional/Extra)
**Role**: Multi-channel notification dispatch

Supports email, SMS, push, and webhook notifications with delivery tracking.

**Key aggregates**:
- `NotificationRecord` — id, type, to, subject, body, status, provider, error, sentAt, createdAt
- `NotificationPayload` — to, subject, body, html, channel, data
- `NotificationProvider` — type, send()

**Statuses**: pending → sent → delivered | failed

**Ubiquitous language**: Notification, Channel, Provider, Delivery, Status

### 9. KV Store (Optional/Extra)
**Role**: Postgres-backed key-value cache

Redis-like API over a Postgres `UNLOGGED TABLE` with TTL support.

**Key aggregates**:
- `KVEntry` — key, value, expiresAt, updatedAt

**Key operations**:
- get, set, del, exists, increment, decrement
- getOrSet (cache-aside pattern)
- clear (pattern-based)
- scan (cursor-based iteration)

**Ubiquitous language**: Key, Value, TTL, Cache, Evict, Scan

### 10. Sync (Optional/Extra)
**Role**: Data synchronization (stub)

Currently a no-op stub. Intended for cross-system data sync.

**Ubiquitous language**: Sync, Replicate, Conflict

## Context Relationships

```
┌──────────────┐    provides infra    ┌──────────────────┐
│   Recruiter  │ ──────────────────→  │  Framework Kernel │
│   (app)      │                      │                   │
└──────┬───────┘                      └──────┬────────────┘
       │                                     │
       │ uses                                │ wires
       ▼                                     ▼
┌──────────────┐    ┌────────────────────────────────────┐
│ Access Ctrl  │    │  Units: db, auth, logs, pubsub,    │
│ (definition) │    │         rpc, storage               │
└──────────────┘    └────────────────────────────────────┘
                            │
                    ┌───────┼───────┬──────────┬──────────┐
                    ▼       ▼       ▼          ▼          ▼
                 Auth    Logs    PubSub    Storage      RPC
                    │       │       │          │          │
                    └───────┴───────┴──────────┴──────────┘
                               │
                          ┌────┴────┐
                          ▼         ▼
                       Postgres    S3
```

## Domain Events Flow

Auth unit defines typed domain events but does not currently publish them via PubSub. This is a known gap (see TODO.md — "events" under THINK).

**Defined events**: user:created, user:updated, user:deleted, session:created, session:invalidated, role:created, role:deleted, role:assigned, role:unassigned

**Intended flow**: Unit/Module → publish(event) → PubSub → subscribers (notifications, audit logs, analytics)

## Known Gaps & Tensions

1. **Module initialization is commented out** — `initialize()` stores modules but doesn't call their lifecycle hooks
2. **Optional units have broken imports** — `~notification` and `~kv-store` import `createDrizzle` from `../db` which no longer exports it
3. **Missing drizzle export** — `./drizzle` subpath in package.json points to empty directory
4. **No migrations** — `getSchemas()` collects schemas but no migration runner exists
5. **TypeScript version fragmentation** — root `^7.0.1-rc`, framework `^5.7.2`, apps `^6.0.2`
6. **Events not wired** — AuthEventMap types exist but PubSub integration is not implemented
7. **Empty domain packages** — hr, analytics, banking, reports are stubs

## Glossary

| Term | Meaning |
|------|---------|
| **Unit** | Infrastructure building block (db, auth, logs, etc.) with lifecycle |
| **Module** | Business logic plugin that receives Unit dependencies |
| **Framework** | Orchestrator class managing Unit/Module lifecycle |
| **Statement** | Permission declaration: `{ resource: [actions] }` |
| **Role** | Named collection of permission statements |
| **Workflow** | Named set of operations on an aggregate (e.g., user workflows) |
| **Context** | AsyncLocalStorage providing request-scoped db + pubsub |
| **HealthCheck** | Boolean probe for unit liveness |
| **Destroy** | Graceful cleanup/shutdown of a unit or module |
