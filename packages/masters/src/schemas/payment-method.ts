import {
  CardBrandSchema,
  MasterEntityTypeSchema,
  PaymentMethodDirectionSchema,
  PaymentMethodStatusSchema,
  PaymentMethodTypeSchema,
} from "#/schemas/enums";
import { IdSchema, MetadataSchema, NameSchema } from "#/schemas/utils";
import {
  isPaymentMethodTypeComplete,
  PAYMENT_METHOD_TYPE_REQUIREMENTS_MESSAGE,
} from "#/utils/payment-method-rules";

import {
  boolean,
  check,
  integer,
  maxValue,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  regex,
  string,
} from "valibot";
import type { InferOutput } from "valibot";

const CARD_LAST4_REGEX = /^\d{4}$/;

const CardExpiryMonthSchema = pipe(
  number(),
  integer(),
  minValue(1, "Must be between 1 and 12"),
  maxValue(12, "Must be between 1 and 12"),
);

const CardExpiryYearSchema = pipe(
  number(),
  integer(),
  minValue(2000, "Must be a 4-digit year"),
  maxValue(2100, "Must be a 4-digit year"),
);

const CardLast4Schema = pipe(string(), regex(CARD_LAST4_REGEX, "Must be exactly 4 digits"));

export const CreatePaymentMethodSchema = pipe(
  object({
    bankAccountId: optional(nullable(IdSchema)),
    bankName: optional(nullable(string())),
    cardBrand: optional(nullable(CardBrandSchema)),
    cardExpiryMonth: optional(nullable(CardExpiryMonthSchema)),
    cardExpiryYear: optional(nullable(CardExpiryYearSchema)),
    cardLast4: optional(nullable(CardLast4Schema)),
    chequeSeries: optional(nullable(string())),
    code: optional(nullable(string())),
    details: optional(nullable(MetadataSchema)),
    direction: PaymentMethodDirectionSchema,
    entityId: IdSchema,
    entityType: MasterEntityTypeSchema,
    isActive: optional(boolean(), true),
    isPrimary: optional(boolean(), false),
    metadata: optional(nullable(MetadataSchema)),
    name: NameSchema,
    status: optional(PaymentMethodStatusSchema, "active"),
    type: PaymentMethodTypeSchema,
    upiId: optional(nullable(string())),
  }),
  check((input) => isPaymentMethodTypeComplete(input), PAYMENT_METHOD_TYPE_REQUIREMENTS_MESSAGE),
);

export type CreatePaymentMethodInput = InferOutput<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = pipe(
  object({
    bankAccountId: optional(nullable(IdSchema)),
    bankName: optional(nullable(string())),
    cardBrand: optional(nullable(CardBrandSchema)),
    cardExpiryMonth: optional(nullable(CardExpiryMonthSchema)),
    cardExpiryYear: optional(nullable(CardExpiryYearSchema)),
    cardLast4: optional(nullable(CardLast4Schema)),
    chequeSeries: optional(nullable(string())),
    code: optional(nullable(string())),
    details: optional(nullable(MetadataSchema)),
    direction: optional(PaymentMethodDirectionSchema),
    isActive: optional(boolean()),
    isPrimary: optional(boolean()),
    metadata: optional(nullable(MetadataSchema)),
    name: optional(NameSchema),
    status: optional(PaymentMethodStatusSchema),
    type: optional(PaymentMethodTypeSchema),
    upiId: optional(nullable(string())),
  }),
  check((input) => {
    if (input.type === undefined) {
      return true;
    }
    return isPaymentMethodTypeComplete({
      bankAccountId: input.bankAccountId,
      cardBrand: input.cardBrand,
      cardExpiryMonth: input.cardExpiryMonth,
      cardExpiryYear: input.cardExpiryYear,
      cardLast4: input.cardLast4,
      type: input.type,
      upiId: input.upiId,
    });
  }, PAYMENT_METHOD_TYPE_REQUIREMENTS_MESSAGE),
);

export type UpdatePaymentMethodInput = InferOutput<typeof UpdatePaymentMethodSchema>;

export const PaymentMethodFiltersSchema = object({
  direction: optional(PaymentMethodDirectionSchema),
  status: optional(PaymentMethodStatusSchema),
  type: optional(PaymentMethodTypeSchema),
});

export type PaymentMethodFilters = InferOutput<typeof PaymentMethodFiltersSchema>;

export const ListPaymentMethodsSchema = object({
  entityId: IdSchema,
  entityType: MasterEntityTypeSchema,
  filters: optional(PaymentMethodFiltersSchema),
});

export type ListPaymentMethodsInput = InferOutput<typeof ListPaymentMethodsSchema>;
