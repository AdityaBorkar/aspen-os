import { healthcareCaregiverConsent } from "#/db-schemas/psych";
import { PSYCH_EVENTS } from "#/pubsub";
import { CreateCaregiverConsentSchema } from "#/schemas/psych";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CaregiverConsentInputSchema = object({
  input: CreateCaregiverConsentSchema,
});

export const caregiverConsent = Workflow.name("healthcare.psych.caregiverConsent")
  .input(CaregiverConsentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateCaregiverConsentSchema, input);
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

    const [row] = await ctx.step.run("insert-caregiver-consent", async () =>
      ctx.db
        .insert(healthcareCaregiverConsent)
        .values({
          branch_id: branchId,
          caregiver_name: parsed.caregiverName,
          created_by: actorId,
          encounter_id: parsed.encounterId ?? null,
          patient_id: parsed.patientId,
          payload: {
            idNumber: parsed.idNumber ?? null,
            patientIsMinor: parsed.patientIsMinor ?? false,
          },
          relation: parsed.relation,
          scope: parsed.scope,
          status: parsed.status,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the caregiver consent.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: row.status === "Signed" ? AUDIT_ACTION.SIGNED : AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PSYCH,
        newState: {
          caregiverName: row.caregiver_name,
          id: row.id,
          patientId: row.patient_id,
          scope: row.scope,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(PSYCH_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      caregiverName: row.caregiver_name,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      idNumber: parsed.idNumber ?? null,
      patientId: row.patient_id,
      relation: row.relation,
      scope: row.scope,
      status: row.status,
    };
  });
