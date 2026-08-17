import type { DatabaseUnit } from "#/server/db";
import { auditLog } from "#/server/db/schema";
import type { AuditLog } from "#/server/db/schema";
import type { JsonValue } from "#/server/types";
import { context } from "#/server/utils";

import { AuditQueryService } from "./query-service";
import type { AuditDatabase, AuditEntry, AuditQuery } from "./types";

export class AuditUnit {
  readonly $name = "audit";

  private readonly db: AuditDatabase;
  private readonly queryService: AuditQueryService;

  constructor({ db }: { db: DatabaseUnit<any> }) {
    // SAFETY: the DatabaseUnit db is a valid node-postgres drizzle instance.
    this.db = db.db as AuditDatabase;
    this.queryService = new AuditQueryService(this.db);
  }

  async $prepareInfra(): Promise<void> {}

  async $cleanup(): Promise<void> {}

  /** Compute a field-level diff between two states. */
  diff(
    before?: Record<string, JsonValue> | null,
    after?: Record<string, JsonValue> | null,
  ): Record<string, { new: unknown; old: unknown }> | undefined {
    if (!before && !after) {
      return undefined;
    }
    const beforeMap = before ?? {};
    const afterMap = after ?? {};
    const keys = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);
    const changes: Record<string, { new: unknown; old: unknown }> = {};
    for (const key of keys) {
      const oldVal = beforeMap[key];
      const newVal = afterMap[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { new: newVal, old: oldVal };
      }
    }
    return Object.keys(changes).length > 0 ? changes : undefined;
  }

  private resolveContextEntry(entry: AuditEntry): AuditEntry {
    const store = context.getStore();
    return {
      ...entry,
      actorId: entry.actorId ?? store?.actorId ?? "system",
      requestId: entry.requestId ?? store?.requestId,
      traceId: entry.traceId ?? store?.traceId,
    };
  }

  /** Write an audit entry, optionally within a provided transaction handle. */
  async write(entry: AuditEntry, db?: AuditDatabase): Promise<void> {
    const target = db ?? this.db;
    const resolved = this.resolveContextEntry(entry);
    await target.insert(auditLog).values({
      action: resolved.action,
      actorId: resolved.actorId ?? "system",
      changes: resolved.changes ?? null,
      crudAction: resolved.crudAction ?? null,
      entityId: resolved.entityId,
      entityType: resolved.entityType,
      idempotencyKey: resolved.idempotencyKey ?? null,
      metadata: resolved.metadata ?? null,
      newState: resolved.newState ?? null,
      previousState: resolved.previousState ?? null,
      requestId: resolved.requestId ?? null,
      traceId: resolved.traceId ?? null,
      workflowRunId: resolved.workflowRunId ?? null,
    });
  }

  /** Run fn and write one or more audit entries in the same transaction. */
  async withTransaction<TResult>(
    entry: AuditEntry | ((result: TResult) => AuditEntry),
    fn: () => Promise<TResult>,
  ): Promise<TResult> {
    return this.db.transaction(async (tx) => {
      const result = await fn();
      const resolved = entry instanceof Function ? entry(result) : entry;
      await this.write(resolved, tx);
      return result;
    });
  }

  async query(filter: AuditQuery): Promise<AuditLog[]> {
    const store = context.getStore();
    return this.queryService.query({
      ...filter,
      tenantId: filter.tenantId ?? store?.tenantId,
    });
  }

  /** Reconstruct a record's current state by replaying its audited changes in seq order. */
  async reconstructState(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, JsonValue> | null> {
    return this.queryService.reconstructState(entityType, entityId);
  }

  async count(filter: AuditQuery): Promise<number> {
    const store = context.getStore();
    return this.queryService.count({
      ...filter,
      tenantId: filter.tenantId ?? store?.tenantId,
    });
  }
}
