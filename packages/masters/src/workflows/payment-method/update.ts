import { masterPaymentMethod } from "#/db-schemas";
import { PAYMENT_METHOD_EVENTS } from "#/pubsub";
import { UpdatePaymentMethodSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPaymentMethodStep } from "#/workflow-steps/fetch-payment-method";
import { assertPaymentMethodTypeFields, unsetPrimaryPaymentMethods } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdatePaymentMethodSchema,
});

export const updatePaymentMethod = Workflow.name("masters.payment-method.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPaymentMethodStep, { id: input.id });

    assertPaymentMethodTypeFields({
      bankAccountId:
        input.patch.bankAccountId !== undefined ? input.patch.bankAccountId : current.bankAccountId,
      cardBrand: input.patch.cardBrand !== undefined ? input.patch.cardBrand : current.cardBrand,
      cardExpiryMonth:
        input.patch.cardExpiryMonth !== undefined
          ? input.patch.cardExpiryMonth
          : current.cardExpiryMonth,
      cardExpiryYear:
        input.patch.cardExpiryYear !== undefined
          ? input.patch.cardExpiryYear
          : current.cardExpiryYear,
      cardLast4: input.patch.cardLast4 !== undefined ? input.patch.cardLast4 : current.cardLast4,
      type: input.patch.type ?? current.type,
      upiId: input.patch.upiId !== undefined ? input.patch.upiId : current.upiId,
    });

    if (input.patch.isPrimary === true) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryPaymentMethods({
          db: ctx.db,
          direction: input.patch.direction ?? current.direction,
          entityId: current.entityId,
          entityType: current.entityType,
        }),
      );
    }

    const [updated] = await ctx.db
      .update(masterPaymentMethod)
      .set({ ...input.patch, updatedAt: new Date() })
      .where(eq(masterPaymentMethod.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Payment method with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: input.patch,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_METHOD,
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.UPDATED, {
        changes: input.patch,
        entityId: updated.entityId,
        entityType: updated.entityType,
        paymentMethod: { id: updated.id, name: updated.name, type: updated.type },
      });
    });

    return updated;
  });
