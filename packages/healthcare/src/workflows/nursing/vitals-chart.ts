import { healthcareNursingVitals } from "#/db-schemas/nursing";
import { healthcareObservation } from "#/db-schemas/observation";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordVitalsSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  buildVitalsObservationRows,
  OBS_PROFILE_BEDSIDE,
} from "#/workflow-steps/canonical-dual-write";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

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
    if (parsed.encounterId) {
      // Sign-freeze: bedside charting against a visit only lands on open
      // encounters; signed (finished) encounters only accept
      // encounter_addendum writes.
      await ctx.step.run(fetchOpenEncounterStep, {
        id: parsed.encounterId,
        patientId: parsed.patientId,
      });
    }
    const score = ews(parsed.temp, parsed.pulse, parsed.spo2);
    const [row] = await ctx.step.run("insert-vitals", async () =>
      // Dual-write (HEALTHCARE-SPEC §§6, 13): legacy bedside vitals first
      // (ews stays a legacy-computed counter), canonical observation rows
      // second, inside one transaction. Profile/source are fixed to
      // bedside; a caller-supplied profile hint is echoed to payload.fhir.
      ctx.db.transaction(async (tx) => {
        const legacyId = crypto.randomUUID();
        const built = buildVitalsObservationRows({
          absorbedId: legacyId,
          absorbedTable: "healthcare_nursing_vitals",
          bpDia: parsed.bpDia ?? null,
          bpSys: parsed.bpSys ?? null,
          bpText: null,
          branchId,
          encounterId: parsed.encounterId ?? null,
          ews: score,
          note: parsed.note ?? null,
          painScore: null,
          patientId: parsed.patientId,
          performerId: ctx.actorId ?? null,
          profile: OBS_PROFILE_BEDSIDE,
          pulse: parsed.pulse ?? null,
          rr: parsed.rr ?? null,
          source: OBS_PROFILE_BEDSIDE,
          spo2: parsed.spo2 ?? null,
          tempC: parsed.temp ?? null,
          weightKg: null,
        });
        const payload = { fhir: { profile_hint: parsed.profile ?? null } };
        const [vitals] = await tx
          .insert(healthcareNursingVitals)
          .values({
            bp_dia: parsed.bpDia ?? null,
            bp_sys: parsed.bpSys ?? null,
            branch_id: branchId,
            encounter_id: parsed.encounterId ?? null,
            ews: score,
            id: legacyId,
            note: parsed.note ?? null,
            patient_id: parsed.patientId,
            payload,
            pulse: parsed.pulse ?? null,
            rr: parsed.rr ?? null,
            spo2: parsed.spo2 ?? null,
            temp: parsed.temp !== undefined ? String(parsed.temp) : null,
          })
          .returning();
        if (!vitals) {
          throw new Error("Failed to chart vitals.");
        }
        if (built.rows.length > 0) {
          await tx.insert(healthcareObservation).values(built.rows);
        }
        return [vitals];
      }),
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
