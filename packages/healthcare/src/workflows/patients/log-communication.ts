import { healthcareCommunication } from "#/db-schemas/patient";
import { PATIENT_EVENTS } from "#/pubsub";
import { LogCommunicationSchema } from "#/schemas/patients";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPatientStep } from "#/workflow-steps/fetch-patient";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const LogCommunicationInputSchema = object({ input: LogCommunicationSchema });

export const logCommunication = Workflow.name("healthcare.patients.log-communication")
  .input(LogCommunicationInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(LogCommunicationSchema, input);
    const branchId = parsed.branchId ?? "main";

    const patient = await ctx.step.run(fetchPatientStep, { id: parsed.patientId });

    // Historical log only; outbound delivery is owned by comms.
    const [row] = await ctx.step.run("insert-communication", async () =>
      ctx.db
        .insert(healthcareCommunication)
        .values({
          branch_id: branchId,
          channel: parsed.channel,
          message: parsed.message,
          patient_id: patient.id,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to log communication.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PATIENT,
        metadata: { kind: "communication", patientId: patient.id },
        newState: { channel: parsed.channel, id: row.id },
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
      channel: row.channel,
      createdAt: row.created_at.toISOString(),
      id: row.id,
      message: row.message,
      patientId: row.patient_id,
    };
  });
