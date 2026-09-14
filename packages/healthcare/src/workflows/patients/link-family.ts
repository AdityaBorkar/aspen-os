import { healthcareFamilyLink } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { CreateFamilyLinkSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const LinkFamilyInputSchema = object({ input: CreateFamilyLinkSchema });

export const linkFamily = Workflow.name("healthcare.patients.link-family")
  .input(LinkFamilyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFamilyLinkSchema, input);
    const branchId = parsed.branchId ?? "main";

    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.patientId });

    const [row] = await ctx.step.run("insert-link", async () =>
      ctx.db
        .insert(healthcareFamilyLink)
        .values({
          branch_id: branchId,
          linked_name: parsed.linkedName,
          linked_phone: parsed.linkedPhone ?? null,
          patient_id: patient.id,
          relation: parsed.relation,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to link family member.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "family-link", patientId: patient.id },
        newState: { id: row.id, linkedName: parsed.linkedName, relation: parsed.relation },
      });
      await ctx.pubsub.publish(PATIENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: patient.id,
      });
    });

    return {
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      linkedName: row.linked_name,
      linkedPhone: row.linked_phone,
      patientId: row.patient_id,
      relation: row.relation,
    };
  });
