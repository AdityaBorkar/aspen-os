import { healthcareService, healthcareServicePrice } from "#/db-schemas/services";
import { SERVICE_EVENTS } from "#/pubsub";
import { ServiceIdSchema } from "#/schemas/services";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceStep, toServiceDto } from "#/workflow-steps/fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PublishServiceInputSchema = object({ input: ServiceIdSchema });

export const publishService = Workflow.name("healthcare.services.publish")
  .input(PublishServiceInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ServiceIdSchema, input);
    const existing = await ctx.step.run(fetchServiceStep, { id: parsed.id });
    if (existing.status === "retired") {
      throw new Error(
        `Service "${parsed.id}" is retired and cannot be published; create a new code instead.`,
      );
    }
    if (existing.status === "published") {
      throw new Error(`Service "${parsed.id}" is already published.`);
    }

    const blockers: string[] = [];
    if (existing.facility_ids.length === 0 && !existing.tele_exempt) {
      blockers.push("no facility mapping (map a facility or mark tele-exempt)");
    }
    const [price] = await ctx.step.run("check-price", async () =>
      ctx.db
        .select({ id: healthcareServicePrice.id })
        .from(healthcareServicePrice)
        .where(eq(healthcareServicePrice.service_id, parsed.id))
        .limit(1),
    );
    if (!price) {
      blockers.push("no price on any pricelist (set a price or rely on the Default pricelist)");
    }
    if (!existing.billing_uom_id) {
      blockers.push("no billing UOM (bind a governed Count/Session unit)");
    }
    if (blockers.length > 0) {
      throw new Error(`Cannot publish "${existing.code}": ${blockers.join("; ")}.`);
    }

    const [row] = await ctx.step.run("publish-service", async () =>
      ctx.db
        .update(healthcareService)
        .set({ status: "published", updated_at: new Date() })
        .where(eq(healthcareService.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to publish service "${parsed.id}".`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: { status: "published" },
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
