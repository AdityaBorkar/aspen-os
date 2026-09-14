import { healthcareService } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { ServiceIdSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceStep, toServiceDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const RetireServiceInputSchema = object({ input: ServiceIdSchema });

export const retireService = Workflow.name("healthcare.services.retire")
  .input(RetireServiceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ServiceIdSchema, input);
    const existing = await ctx.step.run(fetchServiceStep, { id: parsed.id });
    if (existing.status === "retired") {
      throw new Error(`Service "${parsed.id}" is already retired.`);
    }
    const [row] = await ctx.step.run("retire-service", async () =>
      ctx.db
        .update(healthcareService)
        .set({ status: "retired", updated_at: new Date() })
        .where(eq(healthcareService.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to retire service "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { status: "retired" },
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
