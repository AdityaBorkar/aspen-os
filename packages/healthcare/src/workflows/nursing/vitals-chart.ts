import { healthcareNursingVitals } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordVitalsSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const VitalsChartInputSchema = object({ input: RecordVitalsSchema });

function ews(temp?: number, pulse?: number, spo2?: number): number {
  let score = 0;
  if (temp !== undefined && (temp < 36 || temp > 38.3)) {
    score += 1;
  }
  if (pulse !== undefined && (pulse < 50 || pulse > 110)) {
    score += 1;
  }
  if (spo2 !== undefined && spo2 < 94) {
    score += 2;
  }
  return score;
}

export const vitalsChart = Workflow.name("healthcare.nursing.vitals-chart")
  .input(VitalsChartInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordVitalsSchema, input);
    const branchId = parsed.branchId ?? "main";
    const score = ews(parsed.temp, parsed.pulse, parsed.spo2);
    const [row] = await ctx.step.run("insert-vitals", async () =>
      ctx.db
        .insert(healthcareNursingVitals)
        .values({
          bp_dia: parsed.bpDia ?? null,
          bp_sys: parsed.bpSys ?? null,
          branch_id: branchId,
          encounter_id: parsed.encounterId ?? null,
          ews: score,
          note: parsed.note ?? null,
          patient_id: parsed.patientId,
          pulse: parsed.pulse ?? null,
          rr: parsed.rr ?? null,
          spo2: parsed.spo2 ?? null,
          temp: parsed.temp !== undefined ? String(parsed.temp) : null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to chart vitals.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { ews: row.ews, patientId: row.patient_id },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      ews: row.ews,
      id: row.id,
      patientId: row.patient_id,
      repeatDue: row.ews > 0,
      repeatPrompt: row.ews > 0 ? "Abnormal vitals: repeat in 15 min and inform the MO" : null,
    };
  });
