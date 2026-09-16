import { healthcareCondition } from "#/db-schemas/condition";
import { healthcareEncounterDiagnosis } from "#/db-schemas/encounters";
import { toFhirHint } from "#/fhir/event-hint";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { AddDiagnosisSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { diagnosisVerificationFromKind } from "#/workflow-steps/canonical-dual-write";
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
    const conditionId = crypto.randomUUID();
    const [row] = await ctx.step.run("insert-diagnosis", async () =>
      // Dual-write (HEALTHCARE-SPEC §§5, 13): legacy diagnosis first,
      // canonical condition second, inside one transaction so both commit
      // or both roll back. Reads stay on the legacy table until cutover.
      // Sign-freeze holds via fetchOpenEncounterStep above: signed
      // (finished) encounters only accept encounter_addendum writes.
      ctx.db.transaction(async (tx) => {
        const [diagnosis] = await tx
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
          .returning();
        if (!diagnosis) {
          throw new Error("Failed to save diagnosis.");
        }
        await tx.insert(healthcareCondition).values({
          branch_id: encounter.branch_id,
          clinical_status: "active",
          code: parsed.code,
          // Encounter diagnoses carry no coding system; ICD11 is the
          // billing-driving default per the problem-list convention.
          code_system: "ICD11",
          encounter_id: parsed.encounterId,
          id: conditionId,
          label: parsed.label,
          onset_at: null,
          patient_id: parsed.patientId,
          payload: {
            fhir: { absorbed_from: { id: diagnosis.id, table: "healthcare_encounter_diagnosis" } },
          },
          rank: diagnosis.is_primary ? 1 : 2,
          recorded_by: ctx.actorId ?? null,
          verification_status: diagnosisVerificationFromKind(
            diagnosis.kind,
            parsed.verificationStatus,
          ),
        });
        return [diagnosis];
      }),
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
        // Hint points at the canonical Condition row written above; the
        // event id stays the encounter so old consumers are unaffected.
        data: { fhir: toFhirHint("Condition", conditionId) },
        id: parsed.encounterId,
      });
    });
    return toDiagnosisDto(row);
  });
