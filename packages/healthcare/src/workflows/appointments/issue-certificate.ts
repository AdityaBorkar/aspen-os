import { healthcareCertificate } from "#/db-schemas/appointments";
import { APPOINTMENT_EVENTS } from "#/pubsub";
import { IssueCertificateSchema } from "#/schemas/appointments";
import { AUDIT_ACTION } from "#/utils/constants";
import { fetchAppointmentStep, toCertificateDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const IssueCertificateInputSchema = object({ input: IssueCertificateSchema });

export const issueCertificate = Workflow.name("healthcare.appointments.issue-certificate")
  .input(IssueCertificateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(IssueCertificateSchema, input);
    const branchId = parsed.branchId ?? "main";
    const appointment = await ctx.step.run(fetchAppointmentStep, {
      id: parsed.appointmentId,
    });
    const [row] = await ctx.step.run("insert-certificate", async () =>
      ctx.db
        .insert(healthcareCertificate)
        .values({
          appointment_id: parsed.appointmentId,
          body: parsed.body,
          branch_id: branchId,
          cert_type: parsed.type,
          id: crypto.randomUUID(),
          patient_id: appointment.patient_id,
          status: "issued",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to issue certificate.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: "healthcare:certificate",
        newState: { id: row.id, type: row.cert_type },
      });
      await ctx.pubsub.publish(APPOINTMENT_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: row.id,
      });
    });
    return toCertificateDto(row);
  });
