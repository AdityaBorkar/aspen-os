import type { PaymentMethodType } from "@aspen-os/constants";

export const PAYMENT_METHOD_TYPE_REQUIREMENTS_MESSAGE =
  "Payment method type requires matching details (card: brand, last4, expiry; upi: upiId; bank_account/imps/cheque: bankAccountId).";

export interface PaymentMethodTypeFields {
  bankAccountId?: string | null | undefined;
  cardBrand?: string | null | undefined;
  cardExpiryMonth?: number | null | undefined;
  cardExpiryYear?: number | null | undefined;
  cardLast4?: string | null | undefined;
  type: PaymentMethodType;
  upiId?: string | null | undefined;
}

export function isPaymentMethodTypeComplete(method: PaymentMethodTypeFields): boolean {
  switch (method.type) {
    case "card": {
      return (
        method.cardBrand !== null &&
        method.cardBrand !== undefined &&
        method.cardLast4 !== null &&
        method.cardLast4 !== undefined &&
        method.cardExpiryMonth !== null &&
        method.cardExpiryMonth !== undefined &&
        method.cardExpiryYear !== null &&
        method.cardExpiryYear !== undefined
      );
    }
    case "upi": {
      return method.upiId !== null && method.upiId !== undefined;
    }
    case "bank_account":
    case "imps":
    case "cheque": {
      return method.bankAccountId !== null && method.bankAccountId !== undefined;
    }
  }
}

export function assertPaymentMethodTypeFields(method: PaymentMethodTypeFields): void {
  if (!isPaymentMethodTypeComplete(method)) {
    throw new Error(PAYMENT_METHOD_TYPE_REQUIREMENTS_MESSAGE);
  }
}
