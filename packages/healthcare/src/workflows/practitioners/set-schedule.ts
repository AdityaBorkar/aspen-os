import { healthcarePractitionerSchedule } from "#/db-schemas/practitioners";
import { PRACTITIONER_EVENTS } from "#/pubsub";
import { SetPractitionerScheduleSchema } from "#/schemas/practitioners";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPractitionerStep, toScheduleDto } from "#/workflow-steps/fetch-practitioner";
import { toMinutes } from "#/workflows/shared/scheduling";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SetScheduleInputSchema = object({ input: SetPractitionerScheduleSchema });

export const setPractitionerSchedule = Workflow.name("healthcare.practitioners.set-schedule")
  .input(SetScheduleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetPractitionerScheduleSchema, input);
    const slotMin = parsed.slotMin ?? 15;
    if (slotMin < 1) {
      throw new Error(`Slot length (${slotMin}) must be at least 1 minute.`);
    }
    if (toMinutes(parsed.start) >= toMinutes(parsed.end)) {
      throw new Error(`Schedule start (${parsed.start}) must be before end (${parsed.end}).`);
    }
    const practitioner = await ctx.step.run(fetchPractitionerStep, {
      id: parsed.practitionerId,
    });
    const [row] = await ctx.step.run("insert-schedule", async () =>
      ctx.db
        .insert(healthcarePractitionerSchedule)
        .values({
          branch_id: parsed.branchId,
          buffer_min: parsed.bufferMin ?? 0,
          emergency_count: parsed.emergencyCount ?? 0,
          end_time: parsed.end,
          facility_id: parsed.facilityId ?? null,
          id: crypto.randomUUID(),
          practitioner_id: parsed.practitionerId,
          slot_min: slotMin,
          start_time: parsed.start,
          video_flag: parsed.videoFlag ?? false,
          weekday: parsed.weekday,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save schedule.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRACTITIONER,
        newState: {
          id: row.id,
          practitionerId: row.practitioner_id,
          weekday: row.weekday,
        },
      });
      await ctx.pubsub.publish(PRACTITIONER_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: practitioner.branch_id,
        id: parsed.practitionerId,
      });
    });
    return toScheduleDto(row);
  });
