import { healthcareFacility } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { OccupyFacilitySchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFacilityStep, toFacilityDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const OccupyInputSchema = object({ input: OccupyFacilitySchema });

export const occupyFacility = Workflow.name("healthcare.facilities.occupy")
  .input(OccupyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(OccupyFacilitySchema, input);
    const existing = await ctx.step.run(fetchFacilityStep, {
      id: parsed.facilityId,
    });
    if (existing.status === "occupied") {
      throw new Error(
        `Facility "${existing.name}" is already occupied; release it before re-occupying.`,
      );
    }
    const occupiedAt = new Date();
    const [row] = await ctx.step.run("occupy-facility", async () =>
      ctx.db
        .update(healthcareFacility)
        .set({
          occupied_at: occupiedAt,
          occupied_note: parsed.note ?? existing.occupied_note,
          status: "occupied",
          updated_at: occupiedAt,
        })
        .where(eq(healthcareFacility.id, parsed.facilityId))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to occupy facility "${parsed.facilityId}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: {
          occupiedAt: occupiedAt.toISOString(),
          status: "occupied",
        },
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
