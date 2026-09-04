import { SERVICE_PROVIDER_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, SP_STATUS } from "#/utils/constants";
import { defineSpStatusTransition } from "#/workflows/sp/transition";

export const activateSp = defineSpStatusTransition({
  auditAction: AUDIT_ACTION.SP_ACTIVATED,
  name: "sp.activate",
  publish: (ctx, serviceProviderId) =>
    ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.ACTIVATED, { serviceProviderId }),
  to: SP_STATUS.ACTIVE,
});
