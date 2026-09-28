import type { JsonValue, WorkflowContext } from "@aspen-os/platform/server";
import { and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

export function assertReturned<TRow>(row: TRow | undefined, message: string): TRow {
  if (!row) {
    throw new Error(message);
  }
  return row;
}

export function requireStatus(
  status: string,
  allowed: readonly string[],
  verb: string,
  noun: string,
): void {
  if (!allowed.includes(status)) {
    throw new Error(`Only ${allowed.join("/")} ${noun} can ${verb} (current: ${status}).`);
  }
}

export function assertDraft(status: string, noun: string): void {
  requireStatus(status, ["draft"], "be edited", noun);
}

export function paginationOf(parsed: { limit?: number; offset?: number }) {
  return { limit: parsed.limit ?? 50, offset: parsed.offset ?? 0 };
}

export function whereFrom(conditions: SQL[]): SQL | undefined {
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export interface MutationEpilogue {
  action: string;
  crudAction: "create" | "update";
  entityId: string;
  entityType: string;
  event?: { payload: Record<string, JsonValue>; topic: string };
  newState: Record<string, JsonValue>;
  previousState?: Record<string, JsonValue>;
}

export async function finishMutation(
  ctx: Pick<WorkflowContext, "audit" | "pubsub">,
  epilogue: MutationEpilogue,
): Promise<void> {
  await ctx.audit.write({
    action: epilogue.action,
    crudAction: epilogue.crudAction,
    entityId: epilogue.entityId,
    entityType: epilogue.entityType,
    newState: epilogue.newState,
    previousState: epilogue.previousState,
  });
  if (epilogue.event) {
    // SAFETY: MutationEpilogue carries per-entity topics validated at each call site; the pubsub unit types topics as string keys.
    await ctx.pubsub.publish(epilogue.event.topic, epilogue.event.payload);
  }
}

export type { AnyPgColumn, PgTable };
