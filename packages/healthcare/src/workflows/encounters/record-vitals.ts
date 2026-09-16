import { healthcareVitals } from "#/db-schemas/encounters";
import { healthcareObservation } from "#/db-schemas/observation";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { RecordVitalsSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  buildVitalsObservationRows,
  OBS_PROFILE_ENCOUNTER_INTAKE,
} from "#/workflow-steps/canonical-dual-write";
import { fetchOpenEncounterStep, toVitalsDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RecordVitalsInputSchema = object({ input: RecordVitalsSchema });

export const recordVitals = Workflow.name("healthcare.encounters.record-vitals")
  .input(RecordVitalsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordVitalsSchema, input);
    const encounter = await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    if (
      parsed.bp === undefined &&
      parsed.pulse === undefined &&
      parsed.spo2 === undefined &&
      parsed.tempC === undefined &&
      parsed.weightKg === undefined
    ) {
      throw new Error("Vitals need at least one measurement.");
    }
    const [row] = await ctx.step.run("insert-vitals", async () =>
      // Dual-write (HEALTHCARE-SPEC §§6, 13): legacy vitals first,
      // canonical observation rows second, inside one transaction so both
      // commit or both roll back. bp text expands to systolic/diastolic
      // components with the raw preserved; unparseable bp stays on the
      // legacy payload. Profile/source are fixed to encounter-intake; a
      // caller-supplied profile hint is echoed to payload.fhir.
      ctx.db.transaction(async (tx) => {
        const legacyId = crypto.randomUUID();
        const built = buildVitalsObservationRows({
          absorbedId: legacyId,
          absorbedTable: "healthcare_vitals",
          bpDia: null,
          bpSys: null,
          bpText: parsed.bp ?? null,
          branchId: encounter.branch_id,
          encounterId: parsed.encounterId,
          ews: null,
          note: null,
          painScore: null,
          patientId: parsed.patientId,
          performerId: ctx.actorId ?? null,
          profile: OBS_PROFILE_ENCOUNTER_INTAKE,
          pulse: parsed.pulse ?? null,
          rr: null,
          source: OBS_PROFILE_ENCOUNTER_INTAKE,
          spo2: parsed.spo2 ?? null,
          tempC: parsed.tempC ?? null,
          weightKg: parsed.weightKg ?? null,
        });
        const payload = {
          fhir: {
            legacy_bp_unparsed: built.unparsedBp,
            profile_hint: parsed.profile ?? null,
          },
        };
        const [vitals] = await tx
          .insert(healthcareVitals)
          .values({
            bp: parsed.bp ?? null,
            branch_id: encounter.branch_id,
            encounter_id: parsed.encounterId,
            id: legacyId,
            patient_id: parsed.patientId,
            payload,
            pulse: parsed.pulse ?? null,
            spo2: parsed.spo2 ?? null,
            temp_c: parsed.tempC !== undefined ? String(parsed.tempC) : null,
            weight_kg: parsed.weightKg !== undefined ? String(parsed.weightKg) : null,
          })
          .returning();
        if (!vitals) {
          throw new Error("Failed to save vitals.");
        }
        if (built.rows.length > 0) {
          await tx.insert(healthcareObservation).values(built.rows);
        }
        return [vitals];
      }),
    );
    if (!row) {
      throw new Error("Failed to save vitals.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: { encounterId: row.encounter_id, id: row.id },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: encounter.branch_id,
        id: parsed.encounterId,
      });
    });
    return toVitalsDto(row);
  });
