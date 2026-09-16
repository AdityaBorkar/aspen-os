import { PSYCH_EVENTS } from "#/pubsub";
import { CreateCaregiverConsentSchema } from "#/schemas/psych";
import { AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";
import { insertCaregiverConsent, signedAuditAction } from "#/workflows/shared/consent-lifecycle";

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
      await ctx.step.run(fetchOpenEncounterStep, {
        id: parsed.encounterId,
        patientId: parsed.patientId,
      });
    }

    const row = await ctx.step.run("insert-caregiver-consent", async () =>
      insertCaregiverConsent(ctx.db, {
        branchId,
        caregiverName: parsed.caregiverName,
        createdBy: actorId,
        encounterId: parsed.encounterId ?? null,
        idNumber: parsed.idNumber ?? null,
        patientId: parsed.patientId,
        patientIsMinor: parsed.patientIsMinor ?? false,
        relation: parsed.relation,
        scope: parsed.scope,
        status: parsed.status,
      }),
    );
    if (!row) {
      throw new Error("Failed to record the caregiver consent.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: signedAuditAction(row.status),
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
