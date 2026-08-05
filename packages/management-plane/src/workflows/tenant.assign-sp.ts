import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { serviceProvider, tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchTenantStep } from "./steps/fetch-tenant";
import { logAuditStep } from "./steps/log-audit";

export const assignServiceProvider = Workflow.name("tenant.assign-sp")
  .input(
    object({
      serviceProviderId: IdSchema,
      tenantId: IdSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { tenantId, serviceProviderId } = input;

    const [sp] = await ctx.db
      .select({ id: serviceProvider.id })
      .from(serviceProvider)
      .where(eq(serviceProvider.id, serviceProviderId))
      .limit(1);

    if (!sp) {
      throw new Error(
        `Service Provider with id "${serviceProviderId}" not found.`,
      );
    }

    await ctx.step.run("assign", async () => {
      await ctx.db
        .update(tenant)
        .set({ serviceProviderId, updatedAt: new Date() })
        .where(eq(tenant.id, tenantId));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.SP_ASSIGNED,
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
