import { healthcareEncounterDiagnosis } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { AddDiagnosisSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep, toDiagnosisDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const AddDiagnosisInputSchema = object({ input: AddDiagnosisSchema });

export const addDiagnosis = Workflow.name("healthcare.encounters.add-diagnosis")
  .input(AddDiagnosisInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AddDiagnosisSchema, input);
    const encounter = await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });
    const duplicate = await ctx.step.run("check-duplicate", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareEncounterDiagnosis.id })
        .from(healthcareEncounterDiagnosis)
        .where(
          and(
            eq(healthcareEncounterDiagnosis.encounter_id, parsed.encounterId),
            eq(healthcareEncounterDiagnosis.code, parsed.code),
          ),
        )
        .limit(1);
      return row ?? null;
    });
    if (duplicate) {
      throw new Error(
        `Diagnosis code "${parsed.code}" is already recorded on encounter ${parsed.encounterId}.`,
      );
    }
    const [row] = await ctx.step.run("insert-diagnosis", async () =>
      ctx.db
        .insert(healthcareEncounterDiagnosis)
        .values({
          branch_id: encounter.branch_id,
          code: parsed.code,
          encounter_id: parsed.encounterId,
          id: crypto.randomUUID(),
          is_primary: parsed.primary ?? false,
          kind: parsed.kind ?? "provisional",
          label: parsed.label,
          patient_id: parsed.patientId,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save diagnosis.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: {
          code: row.code,
          encounterId: row.encounter_id,
          id: row.id,
        },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: encounter.branch_id,
        id: parsed.encounterId,
      });
    });
    return toDiagnosisDto(row);
  });
