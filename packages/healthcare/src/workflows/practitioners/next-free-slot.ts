import { healthcareAppointment } from "#/db-schemas/appointments";
import { healthcarePractitionerSchedule } from "#/db-schemas/practitioners";
import { NextFreeSlotQuerySchema } from "#/schemas/practitioners";
import { fetchPractitionerStep } from "#/workflow-steps/fetch-practitioner";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const NextFreeSlotInputSchema = object({ input: NextFreeSlotQuerySchema });

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const nextPractitionerFreeSlot = Workflow.name("healthcare.practitioners.next-free-slot")
  .input(NextFreeSlotInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(NextFreeSlotQuerySchema, input);
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const schedules = await ctx.step.run("query-schedules", async () =>
      ctx.db
        .select()
        .from(healthcarePractitionerSchedule)
        .where(
          and(
            eq(healthcarePractitionerSchedule.branch_id, practitioner.branch_id),
            eq(healthcarePractitionerSchedule.practitioner_id, parsed.practitionerId),
          ),
        )
        .limit(100),
    );
    const booked = await ctx.step.run("query-booked-slots", async () =>
      ctx.db
        .select({ slot_start: healthcareAppointment.slot_start })
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
    const bookedMinutes = new Set(booked.map((row) => row.slot_start.toISOString().slice(0, 16)));
    if (schedules.length === 0) {
      throw new Error(
        `No schedule found for practitioner "${parsed.practitionerId}"; set a schedule first.`,
      );
    }
    const base = parsed.from ?? new Date().toISOString().slice(0, 10);
    for (let day = 0; day < 14; day += 1) {
      const date = new Date(`${base}T00:00:00`);
      date.setDate(date.getDate() + day);
      const datePart = date.toISOString().slice(0, 10);
      const weekday = WEEKDAYS[date.getUTCDay()] ?? "sun";
      for (const schedule of schedules.filter((entry) => entry.weekday === weekday)) {
        const [startHour, startMinute] = schedule.start_time.split(":").map(Number);
        const [endHour, endMinute] = schedule.end_time.split(":").map(Number);
        const startMin = (startHour ?? 0) * 60 + (startMinute ?? 0);
        const endMin = (endHour ?? 0) * 60 + (endMinute ?? 0);
        for (
          let mins = startMin;
          mins + schedule.slot_min <= endMin;
          mins += schedule.slot_min + schedule.buffer_min
        ) {
          const slot = `${datePart}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00`;
          if (slot >= (parsed.from ?? "") && !bookedMinutes.has(slot.slice(0, 16))) {
            return {
              practitionerId: parsed.practitionerId,
              scheduleId: schedule.id,
              slotStart: slot,
            };
          }
        }
      }
    }
    throw new Error(
      `No free slot in the next 14 days for practitioner "${parsed.practitionerId}"; extend the schedule and retry.`,
    );
  });
