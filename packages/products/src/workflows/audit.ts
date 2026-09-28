import { toCamelKeys } from "#/utils/case";

import type { AuditUnit, JsonValue, WorkflowContext } from "@aspen-os/platform/server";

type AuditEntry = Parameters<AuditUnit["write"]>[0];

/**
 * Durable audit-only step. Use for entities without an event contract
 * (manufacturers, attributes, alternatives, UOMs, settings, sub-codes) and
 * for hard deletes, which have no follow-up subscribers by design.
 */
export async function runAuditStep(ctx: WorkflowContext, entry: AuditEntry): Promise<void> {
  await ctx.step.run("audit", async () => {
    await ctx.audit.write(entry);
  });
}

/**
 * Durable audit-and-publish step. Use for every state transition on entities
 * with an event contract (items, groups, brands, variants, reorder rules,
 * barcodes, price lists, item prices) so audit and event cannot diverge.
 */
// oxlint-disable eslint/max-params
export async function runAuditNotifyStep(
  ctx: WorkflowContext,
  entry: AuditEntry,
  topic: string,
  payload: Record<string, JsonValue>,
): Promise<void> {
  await ctx.step.run("audit-and-notify", async () => {
    await ctx.audit.write(entry);
    await ctx.pubsub.publish(topic, payload);
  });
}
// oxlint-enable eslint/max-params

/**
 * Convert a snake_case DB update map to camelCase event changes at the
 * publish boundary. Audit keeps the DB-shaped keys; events speak camelCase.
 */
export function eventChanges(updates: Record<string, JsonValue>): Record<string, JsonValue> {
  return toCamelKeys(updates);
}
