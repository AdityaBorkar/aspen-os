import { healthcareAppointment } from "#/db-schemas/appointments";
import { toFhirHint } from "#/fhir/event-hint";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { RescheduleAppointmentSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAppointmentStep, toAppointmentDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const RescheduleInputSchema = object({ input: RescheduleAppointmentSchema });

export const rescheduleAppointment = Workflow.name("healthcare.appointments.reschedule")
  .input(RescheduleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RescheduleAppointmentSchema, input);
    const current = await ctx.step.run(fetchAppointmentStep, { id: parsed.id });
    if (current.status === "cancelled" || current.status === "checked-in") {
      throw new Error(
        `Appointment ${parsed.id} is ${current.status}; only booked appointments can be rescheduled.`,
      );
    }
    const newSlot = new Date(parsed.slotStart);
    if (Number.isNaN(newSlot.getTime())) {
      throw new Error(`Slot start "${parsed.slotStart}" is not a valid date.`);
    }
    const clash = await ctx.step.run("recheck-clash", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareAppointment.id })
        .from(healthcareAppointment)
        .where(
          and(
            eq(healthcareAppointment.branch_id, current.branch_id),
            eq(healthcareAppointment.practitioner_id, current.practitioner_id),
            eq(healthcareAppointment.slot_start, newSlot),
            ne(healthcareAppointment.status, "cancelled"),
            ne(healthcareAppointment.id, parsed.id),
          ),
        )
        .limit(1);
      return row ?? null;
    });
    if (clash) {
      throw new Error(
        `Slot ${parsed.slotStart} is already booked; pick another slot or reschedule ${clash.id}.`,
      );
    }
    const [row] = await ctx.step.run("update-slot", async () =>
      ctx.db
        .update(healthcareAppointment)
        .set({
          payload: {
            ...current.payload,
            rescheduleReason: parsed.reason,
          },
          slot_start: newSlot,
          status: "rescheduled",
        })
        .where(eq(healthcareAppointment.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to reschedule appointment "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: { id: row.id, slotStart: row.slot_start.toISOString() },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        data: { fhir: toFhirHint("Appointment", row.id) },
        id: row.id,
      });
    });
    return toAppointmentDto(row);
  });
