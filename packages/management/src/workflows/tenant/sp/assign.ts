import { tenant } from "#/db-schemas";
import { TENANT_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireServiceProvider } from "#/utils/require-sp";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const assignServiceProvider = Workflow.name("tenant.assign-sp")
  .input(
    object({
      serviceProviderId: IdSchema,
      tenantId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { tenantId, serviceProviderId } = input;

    await ctx.step.run(fetchTenantStep, { id: tenantId });
    await requireServiceProvider(ctx, serviceProviderId);

    await ctx.step.run("assign", async () => {
      const [updated] = await ctx.db
        .update(tenant)
        .set({ service_provider_id: serviceProviderId, updated_at: new Date() })
        .where(eq(tenant.id, tenantId))
        .returning();

      if (!updated) {
        throw new Error(`Tenant with id "${tenantId}" not found.`);
      }
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SP_ASSIGNED,
        crudAction: "update",
        entityId: tenantId,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { serviceProviderId },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.SP_ASSIGNED, {
        serviceProviderId,
        tenantId,
      });
    });

    return ctx.step.run(fetchTenantStep, { id: tenantId });
  });
