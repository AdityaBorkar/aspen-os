import { healthcareNursingNote } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { CreateNursingNoteSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RecordNoteInputSchema = object({ input: CreateNursingNoteSchema });

export const recordNote = Workflow.name("healthcare.nursing.record-note")
  .input(RecordNoteInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateNursingNoteSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-note", async () =>
      ctx.db
        .insert(healthcareNursingNote)
        .values({
          branch_id: branchId,
          encounter_id: parsed.encounterId ?? null,
          note: parsed.note,
          patient_id: parsed.patientId,
          recorded_by: parsed.recordedBy ?? ctx.actorId ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record nursing note.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { patientId: row.patient_id },
      });
      await ctx.pubsub.publish(NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, patientId: row.patient_id };
  });
