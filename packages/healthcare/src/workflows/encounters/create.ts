import { healthcareEncounter } from "#/db-schemas/encounters";
import { ENCOUNTER_EVENTS } from "#/pubsub";
import { CreateEncounterSchema } from "#/schemas/encounters";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toEncounterDto } from "#/workflow-steps/fetch-encounter";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateEncounterSchema });

export const createEncounter = Workflow.name("healthcare.encounters.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateEncounterSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-encounter", async () =>
      ctx.db
        .insert(healthcareEncounter)
        .values({
          appointment_id: parsed.appointmentId ?? null,
          branch_id: branchId,
          id: crypto.randomUUID(),
          patient_id: parsed.patientId,
          specialty: parsed.specialty,
          status: "open",
          visit_type: parsed.visitType,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to create encounter.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ENCOUNTER,
        newState: {
          id: row.id,
          patientId: row.patient_id,
          specialty: row.specialty,
        },
      });
      await ctx.pubsub.publish(ENCOUNTER_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });
    return toEncounterDto(row);
  });
