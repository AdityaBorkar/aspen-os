import { healthcareService } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { MapFacilitiesSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceStep, toServiceDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const MapFacilitiesInputSchema = object({ input: MapFacilitiesSchema });

export const mapServiceFacilities = Workflow.name("healthcare.services.map-facilities")
  .input(MapFacilitiesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MapFacilitiesSchema, input);
    const existing = await ctx.step.run(fetchServiceStep, {
      id: parsed.serviceId,
    });
    if (existing.facility_ids.includes(parsed.facilityId)) {
      return toServiceDto(existing);
    }
    const facilityIds = [...existing.facility_ids, parsed.facilityId];
    const [row] = await ctx.step.run("map-facility", async () =>
      ctx.db
        .update(healthcareService)
        .set({ facility_ids: facilityIds, updated_at: new Date() })
        .where(eq(healthcareService.id, parsed.serviceId))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to map facility for service "${parsed.serviceId}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { facilityIds },
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE,
      });
      await ctx.pubsub.publish(SERVICE_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: row.branch_id,
        id: row.id,
      });
    });
    return toServiceDto(row);
  });
