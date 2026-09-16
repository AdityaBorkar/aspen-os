import { healthcareAppointment } from "#/db-schemas/appointments";
import { AppointmentFiltersSchema } from "#/schemas/appointments";
import { appointmentLedgerStatus } from "#/workflow-steps/canonical-dual-write";
import { toAppointmentDto } from "#/workflow-steps/fetch-appointment";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: AppointmentFiltersSchema });

export const listAppointments = Workflow.name("healthcare.appointments.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AppointmentFiltersSchema, input);
    const branchId = parsed.branchId ?? "main";
    const rows = await ctx.step.run("list-appointments", async () => {
      const conditions: SQL[] = [eq(healthcareAppointment.branch_id, branchId)];
      if (parsed.practitionerId) {
        conditions.push(eq(healthcareAppointment.practitioner_id, parsed.practitionerId));
      }
      if (parsed.patientId) {
        conditions.push(eq(healthcareAppointment.patient_id, parsed.patientId));
      }
      if (parsed.facilityId) {
        conditions.push(eq(healthcareAppointment.facility_id, parsed.facilityId));
      }
      if (parsed.status) {
        // SAFETY: AppointmentFiltersSchema documents status as an appointment status value;
        // appointmentLedgerStatus() collapses canonical aliases onto the closest ledger
        // literal before the eq() comparison binds it to the enum-typed status column,
        // so the cast only names the column type for the query builder.
        conditions.push(
          eq(
            healthcareAppointment.status,
            appointmentLedgerStatus(
              parsed.status,
            ) as (typeof healthcareAppointment.status.enumValues)[number],
          ),
        );
      }
      if (parsed.date) {
        const dayStart = new Date(`${parsed.date}T00:00:00Z`);
        const dayEnd = new Date(`${parsed.date}T00:00:00Z`);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        conditions.push(gte(healthcareAppointment.slot_start, dayStart));
        conditions.push(lt(healthcareAppointment.slot_start, dayEnd));
      }
      return ctx.db
        .select()
        .from(healthcareAppointment)
        .where(and(...conditions))
        .orderBy(desc(healthcareAppointment.slot_start))
        .limit(parsed.limit ?? 300)
        .offset(parsed.offset ?? 0);
    });
    return rows.map(toAppointmentDto);
  });
