import { masterPaymentMethod } from "#/db-schemas";
import { PAYMENT_METHOD_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPaymentMethodStep } from "#/workflow-steps/fetch-payment-method";
import { unsetPrimaryPaymentMethods } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const setPrimaryPaymentMethod = Workflow.name("masters.payment-method.set-primary")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const paymentMethod = await ctx.step.run(fetchPaymentMethodStep, { id: input.id });

    await ctx.step.run("unset-primary", () =>
      unsetPrimaryPaymentMethods({
        db: ctx.db,
        direction: paymentMethod.direction,
        entityId: paymentMethod.entityId,
        entityType: paymentMethod.entityType,
      }),
    );

    const [updated] = await ctx.db
      .update(masterPaymentMethod)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(masterPaymentMethod.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Payment method with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.PRIMARY_SET,
        entityId: paymentMethod.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_METHOD,
        metadata: {
          direction: paymentMethod.direction,
          entityId: paymentMethod.entityId,
          entityType: paymentMethod.entityType,
        },
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.PRIMARY_SET, {
        direction: paymentMethod.direction,
        entityId: paymentMethod.entityId,
        entityType: paymentMethod.entityType,
        paymentMethodId: paymentMethod.id,
      });
    });

    return updated;
  });
