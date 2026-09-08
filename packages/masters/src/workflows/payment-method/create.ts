import { masterPaymentMethod } from "#/db-schemas";
import { PAYMENT_METHOD_EVENTS } from "#/pubsub";
import { CreatePaymentMethodSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { unsetPrimaryPaymentMethods } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreatePaymentMethodSchema });

export const createPaymentMethod = Workflow.name("masters.payment-method.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePaymentMethodSchema, input);

    if (parsed.isPrimary) {
      await ctx.step.run("unset-primary", () =>
        unsetPrimaryPaymentMethods({
          db: ctx.db,
          direction: parsed.direction,
          entityId: parsed.entityId,
          entityType: parsed.entityType,
        }),
      );
    }

    const [paymentMethod] = await ctx.db
      .insert(masterPaymentMethod)
      .values({
        account_holder_name: parsed.accountHolderName ?? null,
        account_number: parsed.accountNumber ?? null,
        account_type: parsed.accountType ?? null,
        bank_name: parsed.bankName ?? null,
        branch_name: parsed.branchName ?? null,
        card_brand: parsed.cardBrand ?? null,
        card_expiry_month: parsed.cardExpiryMonth ?? null,
        card_expiry_year: parsed.cardExpiryYear ?? null,
        card_last4: parsed.cardLast4 ?? null,
        cheque_series: parsed.chequeSeries ?? null,
        code: parsed.code ?? null,
        currency: parsed.currency ?? null,
        details: parsed.details ?? null,
        direction: parsed.direction,
        entity_id: parsed.entityId,
        entity_type: parsed.entityType,
        is_active: parsed.isActive,
        is_primary: parsed.isPrimary,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        routing_number: parsed.routingNumber ?? null,
        status: parsed.status,
        swift_code: parsed.swiftCode ?? null,
        type: parsed.type,
        upi_id: parsed.upiId ?? null,
      })
      .returning();

    if (!paymentMethod) {
      throw new Error("Failed to create payment method.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: paymentMethod.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT_METHOD,
        newState: {
          direction: paymentMethod.direction,
          entityId: paymentMethod.entity_id,
          entityType: paymentMethod.entity_type,
          name: paymentMethod.name,
          type: paymentMethod.type,
        },
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.CREATED, {
        entityId: paymentMethod.entity_id,
        entityType: paymentMethod.entity_type,
        paymentMethod: { id: paymentMethod.id, name: paymentMethod.name, type: paymentMethod.type },
      });
    });

    return paymentMethod;
  });
