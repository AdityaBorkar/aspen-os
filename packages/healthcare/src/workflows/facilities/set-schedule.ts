import { healthcareFacility } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { SetFacilityScheduleSchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import {
  fetchFacilityStep,
  readFacilitySchedules,
  toFacilityDto,
} from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SetScheduleInputSchema = object({ input: SetFacilityScheduleSchema });

export const setFacilitySchedule = Workflow.name("healthcare.facilities.set-schedule")
  .input(SetScheduleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SetFacilityScheduleSchema, input);
    if (parsed.open >= parsed.close) {
      throw new Error(
        `Opening time (${parsed.open}) must be before closing time (${parsed.close}).`,
      );
    }
    const existing = await ctx.step.run(fetchFacilityStep, {
      id: parsed.facilityId,
    });
    const schedules = readFacilitySchedules(existing.payload).filter(
      (entry) => entry.weekday !== parsed.weekday,
    );
    schedules.push({
      close: parsed.close,
      open: parsed.open,
      weekday: parsed.weekday,
    });
    const [row] = await ctx.step.run("update-schedules", async () =>
      ctx.db
        .update(healthcareFacility)
        .set({
          payload: { ...existing.payload, schedules },
          updated_at: new Date(),
        })
        .where(eq(healthcareFacility.id, parsed.facilityId))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to save schedule for facility "${parsed.facilityId}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { schedules },
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.FACILITY,
      });
      await ctx.pubsub.publish(FACILITY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toFacilityDto(row);
  });
