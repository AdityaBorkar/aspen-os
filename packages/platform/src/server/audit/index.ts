import type { DatabaseUnit } from "../db";
import { context } from "../utils/context";
import { auditLog } from "./db-schema";
import { AuditQueryService } from "./query-service";
import type { AuditDatabase, AuditEntry, AuditQuery } from "./types";

export {
  type AuditLog,
  auditLog,
  type NewAuditLog,
} from "./db-schema";
export { AuditQueryService } from "./query-service";
export type { AuditEntry, AuditQuery, CrudAction } from "./types";

export class AuditUnit {
  readonly $name = "audit";

  private db: AuditDatabase;
  private queryService: AuditQueryService;

  constructor({
    db,
  }: {
    // biome-ignore lint/suspicious/noExplicitAny: drizzle NodePgDatabase invariance forces any here
    db: DatabaseUnit<any>;
  }) {
    this.db = db.db as AuditDatabase;
    this.queryService = new AuditQueryService(this.db);
  }

  async $prepareInfra(): Promise<void> {
    return;
  }

  async $cleanup(): Promise<void> {
    return;
  }

  /** Compute a field-level diff between two states. */
  diff(
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null,
  ): Record<string, { new: unknown; old: unknown }> | undefined {
    if (!before && !after) return undefined;
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
      requestId: entry.requestId ?? (store as { requestId?: string }).requestId,
      traceId: entry.traceId ?? (store as { traceId?: string }).traceId,
    };
  }

  /** Write an audit entry, optionally within a provided transaction handle. */
  async write(entry: AuditEntry, db?: AuditDatabase): Promise<void> {
    const store = context.getStore();
    const target = db ?? this.db ?? store?.db;
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
  async withTransaction<T>(
    entry: AuditEntry | ((result: T) => AuditEntry),
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const result = await fn();
      const resolved = typeof entry === "function" ? entry(result) : entry;
      await this.write(resolved, tx as unknown as AuditDatabase);
      return result;
    });
  }

  async query(filter: AuditQuery): Promise<unknown[]> {
    const store = context.getStore();
    return this.queryService.query({
      ...filter,
      tenantId: filter.tenantId ?? store?.tenantId,
    });
  }

  /** Reconstruct a record's current state by replaying its audited changes in seq order. */
  reconstructState(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
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
