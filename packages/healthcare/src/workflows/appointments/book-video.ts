import { healthcareAppointment, healthcareVideoSession } from "#/db-schemas/appointments";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { BookVideoSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toAppointmentDto, toVideoSessionDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const BookVideoInputSchema = object({ input: BookVideoSchema });

export const bookVideo = Workflow.name("healthcare.appointments.book-video")
  .input(BookVideoInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BookVideoSchema, input);
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
    const appointmentId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);
    const joinLink = `https://video/session/${sessionId}`;
    const [appointment] = await ctx.step.run("insert-video-booking", async () =>
      ctx.db
        .insert(healthcareAppointment)
        .values({
          branch_id: branchId,
          daycare: false,
          id: appointmentId,
          patient_id: parsed.patientId,
          payload: parsed.note ? { note: parsed.note } : {},
          practitioner_id: parsed.practitionerId,
          pricelist: "standard",
          slot_start: slotStart,
          status: "booked",
          tele: true,
        })
        .returning(),
    );
    if (!appointment) {
      throw new Error("Failed to book video appointment.");
    }
    const [session] = await ctx.step.run("insert-video-session", async () =>
      ctx.db
        .insert(healthcareVideoSession)
        .values({
          appointment_id: appointmentId,
          branch_id: branchId,
          expires_at: expiresAt,
          id: sessionId,
          join_link: joinLink,
          patient_id: parsed.patientId,
          practitioner_id: parsed.practitionerId,
          status: "scheduled",
        })
        .returning(),
    );
    if (!session) {
      throw new Error("Failed to create video session.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: appointmentId,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: {
          id: appointmentId,
          sessionId,
          slotStart: slotStart.toISOString(),
        },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: appointmentId,
      });
    });
    return {
      appointment: toAppointmentDto(appointment),
      session: toVideoSessionDto(session),
    };
  });
