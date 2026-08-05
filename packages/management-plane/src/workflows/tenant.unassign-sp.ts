import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchTenantStep } from "./steps/fetch-tenant";

export const unassignServiceProvider = Workflow.name("tenant.unassign-sp")
  .input(object({ tenantId: IdSchema }))
  .handler(async (input, ctx) => {
    const { tenantId } = input;

    await ctx.step.run("unassign", async () => {
      await ctx.db
        .update(tenant)
        .set({ serviceProviderId: null, updatedAt: new Date() })
        .where(eq(tenant.id, tenantId));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SP_UNASSIGNED,
        crudAction: "update",
        entityId: tenantId,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
      });

      await ctx.pubsub.publish(TENANT_EVENTS.SP_UNASSIGNED, { tenantId });
    });

    return ctx.step.run(fetchTenantStep, { id: tenantId });
  });
