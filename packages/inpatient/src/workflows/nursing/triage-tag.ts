import { healthcareTriageTag } from "#/db-schemas/nursing";
import { NURSING_EVENTS } from "#/pubsub";
import { RecordTriageTagSchema } from "#/schemas/nursing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const TriageTagInputSchema = object({ input: RecordTriageTagSchema });

export const triageTag = Workflow.name("inpatient.nursing.triage-tag")
  .input(TriageTagInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecordTriageTagSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-tag", async () =>
      ctx.db
        .insert(healthcareTriageTag)
        .values({
          branch_id: branchId,
          patient_id: parsed.patientId,
          reason: parsed.reason,
          tag: parsed.tag,
          tagged_by: ctx.actorId ?? null,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record triage tag.");
    }
    const at = new Date().toISOString();
    const red = row.tag === "red";
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: red ? AUDIT_ACTION.ESCALATED : AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.NURSING,
        newState: { patientId: row.patient_id, reason: row.reason, tag: row.tag },
      });
      await ctx.pubsub.publish(red ? NURSING_EVENTS.ESCALATED : NURSING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return { id: row.id, patientId: row.patient_id, tag: row.tag };
  });
