import { healthcareSterilizationLog } from "#/db-schemas/facilities";
import { FACILITY_EVENTS } from "#/pubsub";
import { LogSterilizationSchema } from "#/schemas/facilities";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFacilityStep, toSterilizationLogDto } from "#/workflow-steps/fetch-facility";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const LogSterilizationInputSchema = object({ input: LogSterilizationSchema });

export const logSterilization = Workflow.name("healthcare.facilities.log-sterilization")
  .input(LogSterilizationInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(LogSterilizationSchema, input);
    const at = new Date(parsed.at);
    if (Number.isNaN(at.getTime())) {
      throw new Error("Sterilization log time must be a valid datetime.");
    }
    const facility = await ctx.step.run(fetchFacilityStep, {
      id: parsed.facilityId,
    });
    const [row] = await ctx.step.run("insert-log", async () =>
      ctx.db
        .insert(healthcareSterilizationLog)
        .values({
          at,
          branch_id: parsed.branchId,
          by: parsed.by ?? null,
          facility_id: parsed.facilityId,
          id: crypto.randomUUID(),
          item: parsed.item,
          method: parsed.method,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save sterilization log.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.FACILITY,
        newState: {
          facilityId: row.facility_id,
          id: row.id,
          item: row.item,
          method: row.method,
        },
      });
      await ctx.pubsub.publish(FACILITY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId: facility.branch_id,
        id: parsed.facilityId,
      });
    });
    return toSterilizationLogDto(row);
  });
