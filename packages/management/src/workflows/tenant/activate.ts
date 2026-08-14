import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { tenant } from "../../db-schemas";
import { TENANT_EVENTS } from "../../pubsub";
import { IdSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../utils/constants";
import { fetchTenantStep } from "../../workflow-steps/fetch-tenant";

export const activateTenant = Workflow.name("tenant.activate")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const { id } = input;

    const [current] = await ctx.db
      .select({ status: tenant.status })
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }
    if (current.status !== "onboarding") {
      throw new Error(
        `Cannot activate tenant "${id}" — current status is "${current.status}", expected "onboarding".`,
      );
    }

    await ctx.step.run("activate", async () => {
      await ctx.db
        .update(tenant)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.TENANT_ACTIVATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { status: "active" },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.ACTIVATED, { tenantId: id });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });
