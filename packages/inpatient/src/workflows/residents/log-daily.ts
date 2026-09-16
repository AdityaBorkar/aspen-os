import { healthcareDailyLog } from "#/db-schemas/residents";
import { RESIDENT_EVENTS } from "#/pubsub";
import { CreateDailyLogSchema } from "#/schemas/residents";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchResidentStep } from "#/workflow-steps/fetch-resident";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const LogDailyInputSchema = object({ input: CreateDailyLogSchema });

export const logDaily = Workflow.name("inpatient.residents.log-daily")
  .input(LogDailyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDailyLogSchema, input);
    const branchId = parsed.branchId ?? "main";
    const resident = await ctx.step.run(fetchResidentStep, { id: parsed.residentId });
    const vitalsComplete =
      parsed.bpSys !== undefined &&
      parsed.bpDys !== undefined &&
      parsed.sugarMgDl !== undefined &&
      parsed.spo2 !== undefined &&
      parsed.tempC !== undefined;
    const [row] = await ctx.step.run("insert-log", async () =>
      ctx.db
        .insert(healthcareDailyLog)
        .values({
          appetite: parsed.appetite ?? null,
          branch_id: branchId,
          mood: parsed.mood ?? null,
          note: parsed.note,
          payload: {
            activity: parsed.activity ?? null,
            bpDys: parsed.bpDys ?? null,
            bpSys: parsed.bpSys ?? null,
            diet: parsed.diet ?? null,
            medsGiven: parsed.medsGiven ?? null,
            physio: parsed.physio ?? null,
            spo2: parsed.spo2 ?? null,
            sugarMgDl: parsed.sugarMgDl ?? null,
            tempC: parsed.tempC ?? null,
            vitalsComplete,
          },
          resident_id: resident.id,
          status: "complete",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record daily log.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.RESIDENT,
        newState: { residentId: row.resident_id },
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
      missedVitals: !vitalsComplete,
      residentId: row.resident_id,
      vitalsComplete,
    };
  });
