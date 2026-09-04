import { TENANT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION } from "#/utils/constants";
import { defineTenantTransition } from "#/workflows/tenant/transition";

export const suspendTenant = defineTenantTransition({
  auditAction: AUDIT_ACTION.TENANT_SUSPENDED,
  expected: ["active"],
  fromLabel: '"active"',
  name: "tenant.suspend",
  newState: (reason) => ({ status: "suspended", suspendedReason: reason ?? null }),
  publish: (ctx, tenantId, reason) =>
    ctx.pubsub.publish(TENANT_EVENTS.SUSPENDED, {
      reason: reason ?? "unspecified",
      tenantId,
    }),
  set: (reason) => ({
    status: "suspended",
    suspendedAt: new Date(),
    suspendedReason: reason ?? null,
    updatedAt: new Date(),
  }),
});
