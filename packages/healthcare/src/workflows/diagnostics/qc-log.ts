import { healthcareQcLog } from "#/db-schemas/diagnostics";
import { DIAGNOSTICS_EVENTS } from "#/pubsub";
import { QcLogSchema } from "#/schemas/diagnostics";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { array, is, object, parse, string } from "valibot";

const QcLogInputSchema = object({ input: QcLogSchema });

const ReagentLotsSchema = array(string());

function readQcPayload(payload: Record<string, JsonValue>) {
  const deviations = is(string(), payload.deviations) ? payload.deviations : null;
  const reagentLots = is(ReagentLotsSchema, payload.reagentLots) ? payload.reagentLots : [];
  const testFamily = is(string(), payload.testFamily) ? payload.testFamily : null;
  return { deviations, reagentLots, testFamily };
}

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
          payload: {
            deviations: parsed.deviations ?? null,
            reagentLots: parsed.reagentLots ?? [],
            testFamily: parsed.testFamily ?? null,
          },
          status: parsed.status,
          value: parsed.value,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to record QC log.");
      }
      return row;
    });

    const qcPayload = readQcPayload(created.payload);
    const dto = {
      deviations: qcPayload.deviations,
      equipment: created.equipment,
      id: created.id,
      loggedAt: created.created_at.toISOString(),
      loggedBy: created.logged_by,
      param: created.param,
      reagentLots: qcPayload.reagentLots,
      status: created.status,
      testFamily: qcPayload.testFamily,
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
