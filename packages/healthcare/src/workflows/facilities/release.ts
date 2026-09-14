import { healthcareFacility } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { ReleaseFacilitySchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFacilityStep, toFacilityDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ReleaseInputSchema = object({ input: ReleaseFacilitySchema });

export const releaseFacility = Workflow.name("healthcare.facilities.release")
  .input(ReleaseInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReleaseFacilitySchema, input);
    const existing = await ctx.step.run(fetchFacilityStep, {
      id: parsed.facilityId,
    });
    if (existing.status !== "occupied") {
      throw new Error(`Facility "${existing.name}" is not occupied; nothing to release.`);
    }
    const [row] = await ctx.step.run("release-facility", async () =>
      ctx.db
        .update(healthcareFacility)
        .set({
          occupied_at: null,
          occupied_note: parsed.note ?? existing.occupied_note,
          status: "free",
          updated_at: new Date(),
        })
        .where(eq(healthcareFacility.id, parsed.facilityId))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to release facility "${parsed.facilityId}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { occupiedAt: null, status: "free" },
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
