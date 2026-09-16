import { healthcareAppointment } from "#/db-schemas/appointments";
import { healthcareLeaveBlock } from "#/db-schemas/practitioners";
import { PractitionerConflictQuerySchema } from "#/schemas/practitioners";
import { fetchPractitionerStep, toLeaveBlockDto } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gte, lte, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const ConflictInputSchema = object({ input: PractitionerConflictQuerySchema });

export const checkPractitionerConflict = Workflow.name("healthcare.practitioners.conflict")
  .input(ConflictInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PractitionerConflictQuerySchema, input);
    if (parsed.to < parsed.from) {
      throw new Error(`Range end (${parsed.to}) cannot be before start (${parsed.from}).`);
    }
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const leaves = await ctx.step.run("query-leave-overlap", async () =>
      ctx.db
        .select()
        .from(healthcareLeaveBlock)
        .where(
          and(
            eq(healthcareLeaveBlock.branch_id, practitioner.branch_id),
            eq(healthcareLeaveBlock.practitioner_id, parsed.practitionerId),
            lte(healthcareLeaveBlock.from_date, parsed.to),
            gte(healthcareLeaveBlock.to_date, parsed.from),
          ),
        )
        .limit(200),
    );
    const booked = await ctx.step.run("query-appointment-overlap", async () =>
      ctx.db
        .select({
          id: healthcareAppointment.id,
          patient_id: healthcareAppointment.patient_id,
          slot_start: healthcareAppointment.slot_start,
          status: healthcareAppointment.status,
        })
        .from(healthcareAppointment)
        .where(
          and(
            eq(healthcareAppointment.branch_id, practitioner.branch_id),
            eq(healthcareAppointment.practitioner_id, parsed.practitionerId),
            ne(healthcareAppointment.status, "cancelled"),
          ),
        )
        .limit(500),
    );
    const appointments = booked
      .filter((row) => {
        const slotStart = row.slot_start.toISOString();
        return slotStart >= parsed.from && slotStart <= parsed.to;
      })
      .map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        slotStart: row.slot_start.toISOString(),
        status: row.status,
      }));
    return {
      appointments,
      from: parsed.from,
      hasConflict: leaves.length > 0 || appointments.length > 0,
      leaves: leaves.map(toLeaveBlockDto),
      practitionerId: parsed.practitionerId,
      to: parsed.to,
    };
  });
