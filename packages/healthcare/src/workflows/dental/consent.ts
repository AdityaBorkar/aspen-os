import { healthcareDentalConsent } from "#/db-schemas/dental";
import { DENTAL_EVENTS } from "#/pubsub";
import { CreateDentalConsentSchema } from "#/schemas/dental";
import { AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";
import { signedAuditAction } from "#/workflows/shared/consent-lifecycle";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ConsentInputSchema = object({ input: CreateDentalConsentSchema });

export const consent = Workflow.name("healthcare.dental.consent")
  .input(ConsentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDentalConsentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

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
        action: signedAuditAction(row.status),
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
