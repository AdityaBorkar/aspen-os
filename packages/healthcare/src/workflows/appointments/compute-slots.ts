import { healthcareAppointment } from "#/db-schemas/appointments";
import { healthcareFacilityBlock } from "#/db-schemas/facilities";
import { healthcareLeaveBlock, healthcarePractitionerSchedule } from "#/db-schemas/practitioners";
import { ComputeSlotsSchema } from "#/schemas/appointments";
import {
  assertDateString,
  dateWithinRange,
  intervalsOverlap,
  toHHMM,
  toMinutes,
  weekdayKeyOf,
} from "#/workflows/shared/scheduling";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, parse } from "valibot";

const ComputeSlotsInputSchema = object({ input: ComputeSlotsSchema });

export interface ComputedSlot {
  reserved: boolean;
  slotStart: string;
  taken: boolean;
}

export const computeSlots = Workflow.name("healthcare.appointments.compute-slots")
  .input(ComputeSlotsInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ComputeSlotsSchema, input);
    const branchId = parsed.branchId ?? "main";
    assertDateString(parsed.date);
    const weekday = weekdayKeyOf(parsed.date);
    const dayStart = new Date(`${parsed.date}T00:00:00Z`);
    const dayEnd = new Date(`${parsed.date}T00:00:00Z`);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const data = await ctx.step.run("fetch-schedule-inputs", async () => {
      const scheduleConditions = [
        eq(healthcarePractitionerSchedule.branch_id, branchId),
        eq(healthcarePractitionerSchedule.practitioner_id, parsed.practitionerId),
        eq(healthcarePractitionerSchedule.weekday, weekday),
      ];
      if (parsed.facilityId) {
        scheduleConditions.push(eq(healthcarePractitionerSchedule.facility_id, parsed.facilityId));
      }
      const [schedules, leaves, blocks, booked] = await Promise.all([
        ctx.db
          .select()
          .from(healthcarePractitionerSchedule)
          .where(and(...scheduleConditions)),
        ctx.db
          .select()
          .from(healthcareLeaveBlock)
          .where(
            and(
              eq(healthcareLeaveBlock.branch_id, branchId),
              eq(healthcareLeaveBlock.practitioner_id, parsed.practitionerId),
            ),
          ),
        ctx.db
          .select()
          .from(healthcareFacilityBlock)
          .where(eq(healthcareFacilityBlock.branch_id, branchId)),
        ctx.db
          .select({ slot_start: healthcareAppointment.slot_start })
          .from(healthcareAppointment)
          .where(
            and(
              eq(healthcareAppointment.branch_id, branchId),
              eq(healthcareAppointment.practitioner_id, parsed.practitionerId),
              ne(healthcareAppointment.status, "cancelled"),
            ),
          ),
      ]);
      return { blocks, booked, leaves, schedules };
    });

    const onLeave = data.leaves.some((leave) =>
      dateWithinRange(parsed.date, leave.from_date, leave.to_date),
    );
    const bookedSet = new Set(
      data.booked
        .filter((booked) => booked.slot_start >= dayStart && booked.slot_start < dayEnd)
        .map((booked) => booked.slot_start.toISOString()),
    );
    const slots: ComputedSlot[] = [];
    for (const schedule of data.schedules) {
      for (
        let minutes = toMinutes(schedule.start_time);
        minutes + schedule.slot_min <= toMinutes(schedule.end_time);
        minutes += schedule.slot_min
      ) {
        const slotStart = new Date(`${parsed.date}T${toHHMM(minutes)}:00Z`);
        const slotEnd = new Date(slotStart.getTime() + schedule.slot_min * 60_000);
        if (onLeave || bookedSet.has(slotStart.toISOString())) {
          slots.push({
            reserved: false,
            slotStart: slotStart.toISOString(),
            taken: true,
          });
          continue;
        }
        let taken = false;
        let reserved = false;
        for (const block of data.blocks) {
          if (parsed.facilityId && block.facility_id && block.facility_id !== parsed.facilityId) {
            continue;
          }
          if (
            intervalsOverlap(
              { from: block.from_at, to: block.to_at },
              { from: slotStart, to: slotEnd },
            )
          ) {
            if ((block.reason ?? "").toLowerCase().includes("reserve")) {
              reserved = true;
            } else {
              taken = true;
              break;
            }
          }
        }
        slots.push({ reserved, slotStart: slotStart.toISOString(), taken });
      }
    }
    return slots.toSorted((left, right) => left.slotStart.localeCompare(right.slotStart));
  });
