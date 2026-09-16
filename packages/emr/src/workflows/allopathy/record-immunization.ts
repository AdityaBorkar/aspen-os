import { healthcareImmunization } from "#/db-schemas/allopathy";
import { ALLOPATHY_EVENTS } from "#/pubsub";
import { CreateImmunizationSchema } from "#/schemas/allopathy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RecordImmunizationInputSchema = object({
  input: CreateImmunizationSchema,
});

export const recordImmunization = Workflow.name("emr.allopathy.record-immunization")
  .input(RecordImmunizationInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateImmunizationSchema, input);
    const branchId = parsed.branchId ?? "main";
    const actorId = ctx.actorId ?? "system";

    const [row] = await ctx.step.run("insert-immunization", async () =>
      ctx.db
        .insert(healthcareImmunization)
        .values({
          branch_id: branchId,
          created_by: actorId,
          dose_no: parsed.doseNo,
          due_date: parsed.dueDate ?? null,
          given_at: parsed.givenAt ?? null,
          patient_id: parsed.patientId,
          status: parsed.status,
          vaccine: parsed.vaccine,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record the immunization.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ALLOPATHY,
        newState: {
          doseNo: row.dose_no,
          id: row.id,
          patientId: row.patient_id,
          status: row.status,
          vaccine: row.vaccine,
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
      branchId: row.branch_id,
      createdAt: row.created_at.toISOString(),
      doseNo: row.dose_no,
      dueDate: row.due_date,
      givenAt: row.given_at,
      id: row.id,
      patientId: row.patient_id,
      status: row.status,
      vaccine: row.vaccine,
    };
  });
