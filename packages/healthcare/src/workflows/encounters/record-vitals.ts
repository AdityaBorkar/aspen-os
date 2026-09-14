import { healthcareVitals } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { RecordVitalsSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
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
      ctx.db
        .insert(healthcareVitals)
        .values({
          bp: parsed.bp ?? null,
          branch_id: encounter.branch_id,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          patient_id: parsed.patientId,
          pulse: parsed.pulse ?? null,
          spo2: parsed.spo2 ?? null,
          temp_c: parsed.tempC !== undefined ? String(parsed.tempC) : null,
          weight_kg: parsed.weightKg !== undefined ? String(parsed.weightKg) : null,
        })
        .returning(),
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
