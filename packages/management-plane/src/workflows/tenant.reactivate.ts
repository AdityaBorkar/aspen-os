import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchTenantStep } from "./steps/fetch-tenant";
import { logAuditStep } from "./steps/log-audit";

export const reactivateTenant = Workflow.name("tenant.reactivate")
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
    if (current.status !== "suspended") {
      throw new Error(
        `Cannot reactivate tenant "${id}" — current status is "${current.status}", expected "suspended".`,
      );
    }

    await ctx.step.run("reactivate", async () => {
      await ctx.db
        .update(tenant)
        .set({
          status: "active",
          suspendedAt: null,
          suspendedReason: null,
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_REACTIVATED,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { status: "active" },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.REACTIVATED, { tenantId: id });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });
