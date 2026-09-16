import { healthcareAppointment } from "#/db-schemas/appointments";
import { toFhirHint } from "#/fhir/event-hint";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { BookAppointmentSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toAppointmentDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const BookInputSchema = object({ input: BookAppointmentSchema });

export const bookAppointment = Workflow.name("healthcare.appointments.book")
  .input(BookInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookAppointmentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const slotStart = new Date(parsed.slotStart);
    if (Number.isNaN(slotStart.getTime())) {
      throw new Error(`Slot start "${parsed.slotStart}" is not a valid date.`);
    }
    const clash = await ctx.step.run("check-clash", async () => {
      const [row] = await ctx.db
        .select({ id: healthcareAppointment.id })
        .from(healthcareAppointment)
        .where(
          and(
            eq(healthcareAppointment.branch_id, branchId),
            eq(healthcareAppointment.practitioner_id, parsed.practitionerId),
            eq(healthcareAppointment.slot_start, slotStart),
            ne(healthcareAppointment.status, "cancelled"),
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
    const [row] = await ctx.step.run("insert-appointment", async () =>
      ctx.db
        .insert(healthcareAppointment)
        .values({
          branch_id: branchId,
          daycare: parsed.daycare ?? false,
          duration_min: parsed.durationMin ?? null,
          facility_id: parsed.facilityId ?? null,
          id: crypto.randomUUID(),
          patient_id: parsed.patientId,
          payload: parsed.note ? { note: parsed.note } : {},
          practitioner_id: parsed.practitionerId,
          pricelist: parsed.pricelist ?? "standard",
          service_id: parsed.serviceId ?? null,
          slot_start: slotStart,
          status: "booked",
          tele: false,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to book appointment.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: {
          id: row.id,
          patientId: row.patient_id,
          practitionerId: row.practitioner_id,
          slotStart: row.slot_start.toISOString(),
        },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        data: {
          appointmentId: row.id,
          fhir: toFhirHint("Appointment", row.id),
          patientId: row.patient_id,
          practitionerId: row.practitioner_id,
          slotStart: row.slot_start.toISOString(),
        },
        id: row.id,
      });
    });
    return toAppointmentDto(row);
  });
