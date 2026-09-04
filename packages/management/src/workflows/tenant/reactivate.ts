import { TENANT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION } from "#/utils/constants";
import { defineTenantTransition } from "#/workflows/tenant/transition";

export const reactivateTenant = defineTenantTransition({
  auditAction: AUDIT_ACTION.TENANT_REACTIVATED,
  expected: ["suspended"],
  fromLabel: '"suspended"',
  name: "tenant.reactivate",
  newState: () => ({ status: "active" }),
  publish: (ctx, tenantId) => ctx.pubsub.publish(TENANT_EVENTS.REACTIVATED, { tenantId }),
  set: () => ({
    status: "active",
    suspendedAt: null,
    suspendedReason: null,
    updatedAt: new Date(),
  }),
});
