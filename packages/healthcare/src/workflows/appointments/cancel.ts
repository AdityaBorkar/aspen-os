import { healthcareAppointment } from "#/db-schemas/appointments";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { CancelAppointmentSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAppointmentStep, toAppointmentDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CancelInputSchema = object({ input: CancelAppointmentSchema });

export const cancelAppointment = Workflow.name("healthcare.appointments.cancel")
  .input(CancelInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CancelAppointmentSchema, input);
    const current = await ctx.step.run(fetchAppointmentStep, { id: parsed.id });
    if (current.status === "cancelled") {
      throw new Error(`Appointment ${parsed.id} is already cancelled.`);
    }
    const [row] = await ctx.step.run("cancel-appointment", async () =>
      ctx.db
        .update(healthcareAppointment)
        .set({
          payload: {
            ...current.payload,
            cancelReason: parsed.reason,
          },
          status: "cancelled",
        })
        .where(eq(healthcareAppointment.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to cancel appointment "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: { id: row.id, status: row.status },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toAppointmentDto(row);
  });
