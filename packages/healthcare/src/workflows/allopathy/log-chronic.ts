import { healthcareChronicLog } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateChronicLogSchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const LogChronicInputSchema = object({ input: CreateChronicLogSchema });

export const logChronic = Workflow.name("healthcare.allopathy.logChronic")
  .input(LogChronicInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateChronicLogSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    if (parsed.encounterId) {
      const encounter = await ctx.step.run(fetchEncounterStep, {
        id: parsed.encounterId,
      });
      if (encounter.status !== "open") {
        throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
      }
      if (encounter.patient_id !== parsed.patientId) {
        throw new Error("Patient does not match the parent encounter; check the selected patient");
      }
    }

    const [row] = await ctx.step.run("insert-chronic-log", async () =>
      ctx.db
        .insert(healthcareChronicLog)
        .values({
          branch_id: branchId,
          condition: parsed.condition,
          created_by: actorId,
          encounter_id: parsed.encounterId ?? null,
          parameter: parsed.parameter,
          patient_id: parsed.patientId,
          payload: {
            ...(parsed.hba1c !== undefined ? { hba1c: parsed.hba1c } : {}),
            ...(parsed.bpSys !== undefined ? { bpSys: parsed.bpSys } : {}),
            ...(parsed.bpDys !== undefined ? { bpDys: parsed.bpDys } : {}),
            ...(parsed.fundalHeightCm !== undefined
              ? { fundalHeightCm: parsed.fundalHeightCm }
              : {}),
          },
          unit: parsed.unit,
          value: String(parsed.value),
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to log the chronic parameter.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
        newState: {
          condition: row.condition,
          id: row.id,
          parameter: row.parameter,
          patientId: row.patient_id,
        },
      });
      await ctx.pubsub.publish(ALLOPATHY_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      condition: row.condition,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      parameter: row.parameter,
      patientId: row.patient_id,
      unit: row.unit,
      value: Number(row.value),
    };
  });
