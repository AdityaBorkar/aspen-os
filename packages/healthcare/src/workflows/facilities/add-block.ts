import { healthcareFacilityBlock } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { CreateFacilityBlockSchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFacilityStep, toFacilityBlockDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddBlockInputSchema = object({ input: CreateFacilityBlockSchema });

export const addFacilityBlock = Workflow.name("healthcare.facilities.add-block")
  .input(AddBlockInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFacilityBlockSchema, input);
    const fromAt = new Date(parsed.from);
    const toAt = new Date(parsed.to);
    if (Number.isNaN(fromAt.getTime()) || Number.isNaN(toAt.getTime())) {
      throw new Error("Block range must be valid datetimes.");
    }
    if (toAt <= fromAt) {
      throw new Error(`Block end (${parsed.to}) must be after start (${parsed.from}).`);
    }
    const facility = await ctx.step.run(fetchFacilityStep, {
      id: parsed.facilityId,
    });
    const [row] = await ctx.step.run("insert-block", async () =>
      ctx.db
        .insert(healthcareFacilityBlock)
        .values({
          branch_id: parsed.branchId,
          facility_id: parsed.facilityId,
          from_at: fromAt,
          id: crypto.randomUUID(),
          reason: parsed.reason ?? null,
          to_at: toAt,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to block facility.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.FACILITY,
        newState: {
          facilityId: row.facility_id,
          from: row.from_at.toISOString(),
          id: row.id,
          to: row.to_at.toISOString(),
        },
      });
      await ctx.pubsub.publish(FACILITY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: facility.branch_id,
        id: parsed.facilityId,
      });
    });
    return toFacilityBlockDto(row);
  });
