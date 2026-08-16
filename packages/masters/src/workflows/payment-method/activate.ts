import { masterPaymentMethod } from "#/db-schemas";
import { PAYMENT_METHOD_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPaymentMethodStep } from "#/workflow-steps/fetch-payment-method";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const activatePaymentMethod = Workflow.name("masters.payment-method.activate")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPaymentMethodStep, { id: input.id });

    if (current.isActive) {
      return current;
    }

    const [updated] = await ctx.db
      .update(masterPaymentMethod)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(masterPaymentMethod.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Payment method with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ACTIVATED,
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_METHOD,
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.ACTIVATED, {
        entityId: updated.entityId,
        entityType: updated.entityType,
        paymentMethodId: updated.id,
      });
    });

    return updated;
  });
