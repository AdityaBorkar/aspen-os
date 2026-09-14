import { healthcareConsent } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { ArchiveConsentSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const ArchiveConsentInputSchema = object({ input: ArchiveConsentSchema });

export const archiveConsent = Workflow.name("healthcare.patients.archive-consent")
  .input(ArchiveConsentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ArchiveConsentSchema, input);
    const branchId = parsed.branchId ?? "main";

    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.patientId });

    const [row] = await ctx.step.run("insert-consent", async () =>
      ctx.db
        .insert(healthcareConsent)
        .values({
          archived_at: new Date(),
          branch_id: branchId,
          granted: parsed.granted,
          note: parsed.note ?? null,
          patient_id: patient.id,
          type: parsed.type,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to archive consent.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "consent", patientId: patient.id },
        newState: { granted: parsed.granted, id: row.id, type: parsed.type },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: patient.id,
      });
    });

    return {
      archivedAt: row.archived_at?.toISOString() ?? null,
      branchId: row.branch_id,
      granted: row.granted,
      id: row.id,
      note: row.note,
      patientId: row.patient_id,
      type: row.type,
    };
  });
