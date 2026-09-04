import { tenant } from "#/db-schemas";
import { IdSchema } from "#/types";
import { AUDIT_ENTITY_TYPE } from "#/utils/constants";
import type { AuditAction, TenantStatus } from "#/utils/constants";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import type { PubSubUnit } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, optional, pipe, string } from "valibot";

export const ReasonSchema = optional(pipe(string(), minLength(1)));

interface TenantTransitionConfig {
  auditAction: AuditAction;
  expected: TenantStatus[];
  fromLabel: string;
  name: string;
  newState: (reason: string | undefined) => Record<string, string | null>;
  publish: (
    ctx: { pubsub: PubSubUnit },
    id: string,
    reason: string | undefined,
  ) => Promise<string | null>;
  set: (reason: string | undefined) => {
    churnReason?: string | null;
    churnedAt?: Date;
    status: TenantStatus;
    suspendedAt?: Date | null;
    suspendedReason?: string | null;
    updatedAt: Date;
  };
}

export function defineTenantTransition(config: TenantTransitionConfig) {
  return Workflow.name(config.name)
    .input(object({ id: IdSchema, reason: ReasonSchema }))
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
      if (!config.expected.includes(current.status)) {
        throw new Error(
          `Cannot transition tenant "${id}" — current status is "${current.status}", expected ${config.fromLabel}.`,
        );
      }

      await ctx.step.run("transition", () =>
        ctx.db.update(tenant).set(config.set(reason)).where(eq(tenant.id, id)),
      );

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: config.auditAction,
          crudAction: "update",
          entityId: id,
          entityType: AUDIT_ENTITY_TYPE.TENANT,
          newState: config.newState(reason),
        });

        await config.publish(ctx, id, reason);
      });

      return ctx.step.run(fetchTenantStep, { id });
    });
}
