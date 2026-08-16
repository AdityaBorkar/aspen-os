import {
  CardBrandSchema,
  MasterEntityTypeSchema,
  PaymentMethodDirectionSchema,
  PaymentMethodStatusSchema,
  PaymentMethodTypeSchema,
} from "#/schemas/enums";
import { IdSchema, NameSchema } from "#/schemas/utils";

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

export const CreatePaymentMethodSchema = pipe(
  object({
    bankAccountId: optional(nullable(IdSchema)),
    bankName: optional(nullable(string())),
    cardBrand: optional(nullable(CardBrandSchema)),
    cardExpiryMonth: optional(
      nullable(
        pipe(
          number(),
          integer(),
          minValue(1, "Must be between 1 and 12"),
          maxValue(12, "Must be between 1 and 12"),
        ),
      ),
    ),
    cardExpiryYear: optional(
      nullable(
        pipe(
          number(),
          integer(),
          minValue(2000, "Must be a 4-digit year"),
          maxValue(2100, "Must be a 4-digit year"),
        ),
      ),
    ),
    cardLast4: optional(
      nullable(pipe(string(), regex(CARD_LAST4_REGEX, "Must be exactly 4 digits"))),
    ),
    chequeSeries: optional(nullable(string())),
    code: optional(nullable(string())),
    details: optional(nullable(object({}))),
    direction: PaymentMethodDirectionSchema,
    entityId: IdSchema,
    entityType: MasterEntityTypeSchema,
    isActive: optional(boolean(), true),
    isPrimary: optional(boolean(), false),
    metadata: optional(nullable(object({}))),
    name: NameSchema,
    status: optional(PaymentMethodStatusSchema, "active"),
    type: PaymentMethodTypeSchema,
    upiId: optional(nullable(string())),
  }),
  check((input) => {
    switch (input.type) {
      case "card": {
        return (
          input.cardBrand !== null &&
          input.cardBrand !== undefined &&
          input.cardLast4 !== null &&
          input.cardLast4 !== undefined &&
          input.cardExpiryMonth !== null &&
          input.cardExpiryMonth !== undefined &&
          input.cardExpiryYear !== null &&
          input.cardExpiryYear !== undefined
        );
      }
      case "upi": {
        return input.upiId !== null && input.upiId !== undefined;
      }
      case "bank_account":
      case "imps":
      case "cheque": {
        return input.bankAccountId !== null && input.bankAccountId !== undefined;
      }
    }
  }, "Payment method type requires matching details (card: brand, last4, expiry; upi: upiId; bank_account/imps/cheque: bankAccountId)."),
);

export type CreatePaymentMethodInput = InferOutput<typeof CreatePaymentMethodSchema>;

export const UpdatePaymentMethodSchema = pipe(
  object({
    bankAccountId: optional(nullable(IdSchema)),
    bankName: optional(nullable(string())),
    cardBrand: optional(nullable(CardBrandSchema)),
    cardExpiryMonth: optional(
      nullable(
        pipe(
          number(),
          integer(),
          minValue(1, "Must be between 1 and 12"),
          maxValue(12, "Must be between 1 and 12"),
        ),
      ),
    ),
    cardExpiryYear: optional(
      nullable(
        pipe(
          number(),
          integer(),
          minValue(2000, "Must be a 4-digit year"),
          maxValue(2100, "Must be a 4-digit year"),
        ),
      ),
    ),
    cardLast4: optional(
      nullable(pipe(string(), regex(CARD_LAST4_REGEX, "Must be exactly 4 digits"))),
    ),
    chequeSeries: optional(nullable(string())),
    code: optional(nullable(string())),
    details: optional(nullable(object({}))),
    direction: optional(PaymentMethodDirectionSchema),
    isActive: optional(boolean()),
    isPrimary: optional(boolean()),
    metadata: optional(nullable(object({}))),
    name: optional(NameSchema),
    status: optional(PaymentMethodStatusSchema),
    type: optional(PaymentMethodTypeSchema),
    upiId: optional(nullable(string())),
  }),
  check((input) => {
    if (input.type === undefined) {
      return true;
    }
    switch (input.type) {
      case "card": {
        return (
          input.cardBrand !== null &&
          input.cardBrand !== undefined &&
          input.cardLast4 !== null &&
          input.cardLast4 !== undefined &&
          input.cardExpiryMonth !== null &&
          input.cardExpiryMonth !== undefined &&
          input.cardExpiryYear !== null &&
          input.cardExpiryYear !== undefined
        );
      }
      case "upi": {
        return input.upiId !== null && input.upiId !== undefined;
      }
      case "bank_account":
      case "imps":
      case "cheque": {
        return input.bankAccountId !== null && input.bankAccountId !== undefined;
      }
    }
  }, "Payment method type requires matching details (card: brand, last4, expiry; upi: upiId; bank_account/imps/cheque: bankAccountId)."),
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
