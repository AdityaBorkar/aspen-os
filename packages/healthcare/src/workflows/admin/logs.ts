import { AuditLogsQuerySchema } from "#/schemas/admin";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const LogsInputSchema = object({ input: AuditLogsQuerySchema });

export const adminLogs = Workflow.name("healthcare.admin.logs")
  .input(LogsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AuditLogsQuerySchema, input);
    // AuditQuery has no branch filter, so branchId is accepted but only
    // action/entityType/limit/offset reach the query.
    const rows = await ctx.step.run("query-audit-logs", async () =>
      ctx.audit.query({
        action: parsed.action,
        entityType: parsed.entityType,
        limit: parsed.limit ?? 100,
        offset: parsed.offset ?? 0,
      }),
    );
    return rows.map((row) => ({
      action: row.action,
      actorId: row.actor_id,
      crudAction: row.crud_action,
      entityId: row.entity_id,
      entityType: row.entity_type,
      id: row.id,
      performedAt:
        row.performed_at instanceof Date
          ? row.performed_at.toISOString()
          : String(row.performed_at),
      seq: row.seq,
    }));
  });
