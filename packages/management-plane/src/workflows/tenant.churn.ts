import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchTenantStep } from "./steps/fetch-tenant";
import { logAuditStep } from "./steps/log-audit";

export const churnTenant = Workflow.name("tenant.churn")
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
    if (current.status !== "active" && current.status !== "suspended") {
      throw new Error(
        `Cannot churn tenant "${id}" — current status is "${current.status}", expected "active" or "suspended".`,
      );
    }

    await ctx.step.run("churn", async () => {
      await ctx.db
        .update(tenant)
        .set({
          churnedAt: new Date(),
          churnReason: reason ?? null,
          status: "churned",
          updatedAt: new Date(),
        })
        .where(eq(tenant.id, id));
    });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.step.run(logAuditStep, {
        action: AUDIT_ACTION.TENANT_CHURNED,
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { churnReason: reason ?? null, status: "churned" },
      });

      await ctx.pubsub.publish(TENANT_EVENTS.CHURNED, {
        reason: reason ?? "unspecified",
        tenantId: id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id });
  });
