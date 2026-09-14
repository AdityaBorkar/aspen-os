import { healthcareVideoSession } from "#/db-schemas/appointments";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { CaptureConsentSchema } from "#/schemas/appointments";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAppointmentStep, toVideoSessionDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CaptureConsentInputSchema = object({ input: CaptureConsentSchema });

export const captureConsent = Workflow.name("healthcare.appointments.capture-consent")
  .input(CaptureConsentInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CaptureConsentSchema, input);
    const appointment = await ctx.step.run(fetchAppointmentStep, {
      id: parsed.appointmentId,
    });
    if (!appointment.tele) {
      throw new Error(
        `Appointment ${parsed.appointmentId} is not a video/tele visit; consent capture applies to video sessions only.`,
      );
    }
    const session = await ctx.step.run("fetch-video-session", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcareVideoSession)
        .where(eq(healthcareVideoSession.appointment_id, parsed.appointmentId))
        .orderBy(desc(healthcareVideoSession.created_at))
        .limit(1);
      if (!row) {
        throw new Error(`No video session found for appointment ${parsed.appointmentId}.`);
      }
      return row;
    });
    const consentedAt = new Date().toISOString();
    const [row] = await ctx.step.run("record-consent", async () =>
      ctx.db
        .update(healthcareVideoSession)
        .set({
          payload: {
            ...session.payload,
            consentGranted: parsed.granted,
            consentNote: parsed.note ?? null,
            consentedAt,
          },
          status: parsed.granted ? "consented" : session.status,
        })
        .where(eq(healthcareVideoSession.id, session.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to record consent.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.APPOINTMENT,
        newState: { granted: parsed.granted, id: row.id },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: appointment.id,
      });
    });
    return toVideoSessionDto(row);
  });
