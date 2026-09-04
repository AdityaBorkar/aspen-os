import { TENANT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION } from "#/utils/constants";
import { defineTenantTransition } from "#/workflows/tenant/transition";

export const churnTenant = defineTenantTransition({
  auditAction: AUDIT_ACTION.TENANT_CHURNED,
  expected: ["active", "suspended"],
  fromLabel: '"active" or "suspended"',
  name: "tenant.churn",
  newState: (reason) => ({ churnReason: reason ?? null, status: "churned" }),
  publish: (ctx, tenantId, reason) =>
    ctx.pubsub.publish(TENANT_EVENTS.CHURNED, {
      reason: reason ?? "unspecified",
      tenantId,
    }),
  set: (reason) => ({
    churnReason: reason ?? null,
    churnedAt: new Date(),
    status: "churned",
    updatedAt: new Date(),
  }),
});
