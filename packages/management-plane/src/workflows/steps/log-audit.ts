import { WorkflowStep } from "@aspen-os/platform/server";
import { nullable, object, optional, record, string, unknown } from "valibot";

import { auditLog } from "../../db-schemas";
import { AuditActionSchema, AuditEntityTypeSchema } from "../../schemas/enums";

const LogAuditInputSchema = object({
  action: AuditActionSchema,
  changes: optional(record(string(), unknown())),
  entityId: string(),
  entityType: AuditEntityTypeSchema,
  newState: optional(nullable(record(string(), unknown()))),
  previousState: optional(nullable(record(string(), unknown()))),
});

export const logAuditStep = WorkflowStep.name("log-audit")
  .input(LogAuditInputSchema)
  .handler(async (input, ctx) => {
    await ctx.db.insert(auditLog).values({
      action: input.action,
      actorId: ctx.actorId ?? "system",
      changes: input.changes ?? null,
      entityId: input.entityId,
      entityType: input.entityType,
      newState: input.newState ?? null,
      previousState: input.previousState ?? null,
    });
  });
