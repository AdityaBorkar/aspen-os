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
        bankAccountId: parsed.bankAccountId ?? null,
        bankName: parsed.bankName ?? null,
        cardBrand: parsed.cardBrand ?? null,
        cardExpiryMonth: parsed.cardExpiryMonth ?? null,
        cardExpiryYear: parsed.cardExpiryYear ?? null,
        cardLast4: parsed.cardLast4 ?? null,
        chequeSeries: parsed.chequeSeries ?? null,
        code: parsed.code ?? null,
        details: parsed.details ?? null,
        direction: parsed.direction,
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        isActive: parsed.isActive,
        isPrimary: parsed.isPrimary,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        status: parsed.status,
        type: parsed.type,
        upiId: parsed.upiId ?? null,
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
          entityId: paymentMethod.entityId,
          entityType: paymentMethod.entityType,
          name: paymentMethod.name,
          type: paymentMethod.type,
        },
      });

      await ctx.pubsub.publish(PAYMENT_METHOD_EVENTS.CREATED, {
        entityId: paymentMethod.entityId,
        entityType: paymentMethod.entityType,
        paymentMethod: { id: paymentMethod.id, name: paymentMethod.name, type: paymentMethod.type },
      });
    });

    return paymentMethod;
  });
