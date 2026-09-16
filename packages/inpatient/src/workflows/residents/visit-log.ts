import { healthcareVisitLog } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateVisitLogSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const VisitLogInputSchema = object({ input: CreateVisitLogSchema });

export const visitLog = Workflow.name("inpatient.residents.visit-log")
  .input(VisitLogInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateVisitLogSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const [row] = await ctx.step.run("insert-visit", async () =>
      ctx.db
        .insert(healthcareVisitLog)
        .values({
          branch_id: branchId,
          payload: {
            timeIn: parsed.timeIn ?? null,
            timeOut: parsed.timeOut ?? null,
          },
          purpose: parsed.purpose,
          relation: parsed.relation ?? null,
          resident_id: resident.id,
          visitor: parsed.visitor,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record visit.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { residentId: row.resident_id, visitor: row.visitor },
      });
      await ctx.pubsub.publish(RESIDENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      id: row.id,
      residentId: row.resident_id,
      timeIn: parsed.timeIn ?? null,
      timeOut: parsed.timeOut ?? null,
      visitor: row.visitor,
    };
  });
