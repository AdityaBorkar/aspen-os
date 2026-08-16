import { masterPaymentMethod } from "#/db-schemas";
import { PAYMENT_METHOD_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPaymentMethodStep } from "#/workflow-steps/fetch-payment-method";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deletePaymentMethod = Workflow.name("masters.payment-method.delete")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPaymentMethodStep, { id: input.id });

    await ctx.db.delete(masterPaymentMethod).where(eq(masterPaymentMethod.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: current.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_METHOD,
        metadata: {
          entityId: current.entityId,
          entityType: current.entityType,
          type: current.type,
        },
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.REMOVED, {
        entityId: current.entityId,
        entityType: current.entityType,
        paymentMethod: { id: current.id, name: current.name, type: current.type },
      });
    });

    return { removed: true };
  });
