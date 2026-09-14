import { healthcareDentalConsent } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateDentalConsentSchema } from "#/schemas/dental";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ConsentInputSchema = object({ input: CreateDentalConsentSchema });

export const consent = Workflow.name("healthcare.dental.consent")
  .input(ConsentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDentalConsentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const encounter = await ctx.step.run(fetchEncounterStep, {
      id: parsed.encounterId,
    });
    if (encounter.status !== "open") {
      throw new Error("Encounter is signed and immutable; file an addendum instead of editing");
    }
    if (encounter.patient_id !== parsed.patientId) {
      throw new Error("Patient does not match the parent encounter; check the selected patient");
    }

    const now = new Date();
    const [row] = await ctx.step.run("insert-dental-consent", async () =>
      ctx.db
        .insert(healthcareDentalConsent)
        .values({
          branch_id: branchId,
          created_by: actorId,
          encounter_id: parsed.encounterId,
          patient_id: parsed.patientId,
          procedure_name: parsed.procedureName,
          signed_at: parsed.status === "Signed" ? now : null,
          status: parsed.status,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the consent form.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: row.status === "Signed" ? AUDIT_ACTION.SIGNED : AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.DENTAL,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
          patientId: row.patient_id,
          procedureName: row.procedure_name,
          status: row.status,
        },
      });
      await ctx.pubsub.publish(DENTAL_EVENTS.CREATED, {
        actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      encounterId: row.encounter_id,
      id: row.id,
      patientId: row.patient_id,
      procedureName: row.procedure_name,
      signedAt: row.signed_at ? row.signed_at.toISOString() : null,
      status: row.status,
    };
  });
