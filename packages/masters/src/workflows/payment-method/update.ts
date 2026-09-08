import { masterPaymentMethod } from "#/db-schemas";
import { PAYMENT_METHOD_EVENTS } from "#/pubsub";
import { UpdatePaymentMethodSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertPaymentMethodTypeFields } from "#/utils/payment-method-rules";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchPaymentMethodStep } from "#/workflow-steps/fetch-payment-method";
import { unsetPrimaryPaymentMethods } from "#/workflows/utils";

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
      accountHolderName:
        input.patch.accountHolderName !== undefined
          ? input.patch.accountHolderName
          : current.account_holder_name,
      accountNumber:
        input.patch.accountNumber !== undefined
          ? input.patch.accountNumber
          : current.account_number,
      bankName: input.patch.bankName !== undefined ? input.patch.bankName : current.bank_name,
      cardBrand: input.patch.cardBrand !== undefined ? input.patch.cardBrand : current.card_brand,
      cardExpiryMonth:
        input.patch.cardExpiryMonth !== undefined
          ? input.patch.cardExpiryMonth
          : current.card_expiry_month,
      cardExpiryYear:
        input.patch.cardExpiryYear !== undefined
          ? input.patch.cardExpiryYear
          : current.card_expiry_year,
      cardLast4: input.patch.cardLast4 !== undefined ? input.patch.cardLast4 : current.card_last4,
      type: input.patch.type ?? current.type,
      upiId: input.patch.upiId !== undefined ? input.patch.upiId : current.upi_id,
    });

    if (input.patch.isPrimary === true) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryPaymentMethods({
          db: ctx.db,
          direction: input.patch.direction ?? current.direction,
          entityId: current.entity_id,
          entityType: current.entity_type,
        }),
      );
    }

    const updates = stripUndefined(input.patch);

    const [updated] = await ctx.db
      .update(masterPaymentMethod)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterPaymentMethod.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Payment method with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_METHOD,
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.UPDATED, {
        changes: updates,
        entityId: updated.entity_id,
        entityType: updated.entity_type,
        paymentMethod: { id: updated.id, name: updated.name, type: updated.type },
      });
    });

    return updated;
  });
