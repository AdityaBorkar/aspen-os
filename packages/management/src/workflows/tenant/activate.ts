import { TENANT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION } from "#/utils/constants";
import { defineTenantTransition } from "#/workflows/tenant/transition";

export const activateTenant = defineTenantTransition({
  auditAction: AUDIT_ACTION.TENANT_ACTIVATED,
  expected: ["onboarding"],
  fromLabel: '"onboarding"',
  name: "tenant.activate",
  newState: () => ({ status: "active" }),
  publish: (ctx, tenantId) => ctx.pubsub.publish(TENANT_EVENTS.ACTIVATED, { tenantId }),
  set: () => ({ status: "active", updatedAt: new Date() }),
});
