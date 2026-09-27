import { TENANT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION } from "#/utils/constants";
import { defineTenantTransition } from "#/workflows/tenant/transition";

export const churnTenant = defineTenantTransition({
  auditAction: AUDIT_ACTION.TENANT_CHURNED,
  expected: ["active", "suspended"],
  fromLabel: '"active" or "suspended"',
  name: "tenant.churn",
  newState: () => ({ status: "churned" }),
  publish: (ctx, tenantId, reason) =>
    ctx.pubsub.publish(TENANT_EVENTS.CHURNED, {
      reason: reason ?? "unspecified",
      tenantId,
    }),
  set: () => ({
    status: "churned",
    updatedAt: new Date(),
  }),
});
