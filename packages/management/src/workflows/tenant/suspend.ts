import { tenant } from "#/db-schemas";
import { TENANT_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

export const suspendTenant = Workflow.name("tenant.suspend")
  .input(
    object({
      id: IdSchema,
      reason: optional(string()),
    }),
  )
  .handler(async (input, ctx) => {
    const { id, reason } = input;

    const [current] = await ctx.db
      .select({ status: tenant.status })
      .from(tenant)
      .where(eq(tenant.id, id))
      .limit(1);

    if (!current) {
      throw new Error(`Tenant with id "${id}" not found.`);
    }
    if (current.status !== "active") {
      throw new Error(
        `Cannot suspend tenant "${id}" — current status is "${current.status}", expected "active".`,
      );
    }

    await ctx.step.run("suspend", async () => {
      await ctx.db
        .update(tenant)
        .set({
          status: "suspended",
          suspendedAt: new Date(),
          suspendedReason: reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.TENANT_SUSPENDED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { status: "suspended", suspendedReason: reason ?? null },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.SUSPENDED, {
        reason: reason ?? "unspecified",
        tenantId: id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });
