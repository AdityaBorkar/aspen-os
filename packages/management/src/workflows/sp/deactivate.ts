import { SERVICE_PROVIDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, SP_STATUS } from "#/utils/constants";
import { defineSpStatusTransition } from "#/workflows/sp/transition";

export const deactivateSp = defineSpStatusTransition({
  auditAction: AUDIT_ACTION.SP_DEACTIVATED,
  name: "sp.deactivate",
  publish: (ctx, serviceProviderId) =>
    ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.DEACTIVATED, { serviceProviderId }),
  to: SP_STATUS.INACTIVE,
});
