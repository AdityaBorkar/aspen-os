import type { AuditAction, AuditEntityType } from "#/utils/constants";

import type { JsonValue, WorkflowContext } from "@aspen-os/platform/server";

export type AuditCrudAction = "create" | "update" | "delete";

export interface AuditEvent {
  payload: Record<string, JsonValue>;
  topic: string;
}

export interface AuditAndPublishInput {
  action: AuditAction;
  changes?: Record<string, JsonValue>;
  crudAction?: AuditCrudAction;
  entityId: string;
  entityType: AuditEntityType;
  event?: AuditEvent | null;
  metadata?: Record<string, JsonValue>;
  newState?: Record<string, JsonValue>;
}

interface AuditWriteEntry {
  action: string;
  changes?: Record<string, JsonValue>;
  crudAction?: AuditCrudAction;
  entityId: string;
  entityType: string;
  metadata?: Record<string, JsonValue>;
  newState?: Record<string, JsonValue>;
}

/**
 * Single helper for the ~20 `audit-and-notify` blocks. Always runs inside a
 * workflow step so audit + publish stay idempotent. Publishing is optional so
 * the few audit-only call sites become explicit instead of silent drift.
 */
export async function auditAndPublish(
  ctx: WorkflowContext,
  input: AuditAndPublishInput,
): Promise<void> {
  await ctx.step.run("audit-and-notify", async () => {
    const entry: AuditWriteEntry = {
      action: input.action,
      entityId: input.entityId,
      entityType: input.entityType,
    };
    if (input.changes !== undefined) {
      entry.changes = input.changes;
    }
    if (input.crudAction !== undefined) {
      entry.crudAction = input.crudAction;
    }
    if (input.metadata !== undefined) {
      entry.metadata = input.metadata;
    }
    if (input.newState !== undefined) {
      entry.newState = input.newState;
    }
    await ctx.audit.write(entry);
    if (input.event) {
      await ctx.pubsub.publish(input.event.topic, input.event.payload);
    }
  });
}
