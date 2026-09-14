import { healthcareQcLog } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { QcLogSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const QcLogInputSchema = object({ input: QcLogSchema });

export const qcLog = Workflow.name("healthcare.diagnostics.qc-log")
  .input(QcLogInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(QcLogSchema, input);
    const branchId = parsed.branchId ?? "main";

    const created = await ctx.step.run("record-qc", async () => {
      const [row] = await ctx.db
        .insert(healthcareQcLog)
        .values({
          branch_id: branchId,
          equipment: parsed.equipment,
          logged_by: parsed.loggedBy,
          param: parsed.param,
          status: parsed.status,
          value: parsed.value,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to record QC log.");
      }
      return row;
    });

    const dto = {
      equipment: created.equipment,
      id: created.id,
      loggedAt: created.created_at.toISOString(),
      loggedBy: created.logged_by,
      param: created.param,
      status: created.status,
      value: created.value,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.DIAGNOSTICS,
        newState: { equipment: created.equipment, id: created.id, status: created.status },
      });
      await ctx.pubsub.publish(DIAGNOSTICS_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
