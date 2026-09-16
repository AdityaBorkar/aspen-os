import { healthcareSoapNote } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateSoapNoteSchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOpenEncounterStep } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveSoapInputSchema = object({ input: CreateSoapNoteSchema });

export const saveSoap = Workflow.name("emr.allopathy.saveSoap")
  .input(SaveSoapInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSoapNoteSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    await ctx.step.run(fetchOpenEncounterStep, {
      id: parsed.encounterId,
      patientId: parsed.patientId,
    });

    const [row] = await ctx.step.run("insert-soap-note", async () =>
      ctx.db
        .insert(healthcareSoapNote)
        .values({
          assessment: parsed.assessment,
          branch_id: branchId,
          created_by: actorId,
          diagnoses: parsed.diagnoses,
          encounter_id: parsed.encounterId,
          objective: parsed.objective,
          patient_id: parsed.patientId,
          plan: parsed.plan,
          subjective: parsed.subjective,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save the SOAP note.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
        newState: {
          encounterId: row.encounter_id,
          id: row.id,
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
      assessment: row.assessment,
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      diagnoses: row.diagnoses,
      encounterId: row.encounter_id,
      id: row.id,
      objective: row.objective,
      patientId: row.patient_id,
      plan: row.plan,
      subjective: row.subjective,
    };
  });
