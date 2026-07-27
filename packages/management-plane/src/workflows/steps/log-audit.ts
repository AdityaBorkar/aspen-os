import { WorkflowStep } from "@aspen-os/platform/server";

import { auditLog } from "../../db-schemas";

export const logAuditStep = WorkflowStep.name("log-audit").handler(
  async (
    input: {
      action: (typeof auditLog.action.enumValues)[number];
      changes?: Record<string, unknown>;
      entityId: string;
      entityType: (typeof auditLog.entityType.enumValues)[number];
      newState?: Record<string, unknown> | null;
      previousState?: Record<string, unknown> | null;
    },
    ctx,
  ) => {
    await ctx.db.insert(auditLog).values({
      action: input.action,
      actorId: ctx.actorId ?? "system",
      changes: input.changes ?? null,
      entityId: input.entityId,
      entityType: input.entityType,
      newState: input.newState ?? null,
      previousState: input.previousState ?? null,
    });
  },
);
