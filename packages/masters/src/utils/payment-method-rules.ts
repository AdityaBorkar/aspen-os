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

type PaymentMethodDetail = string | number | null | undefined;

function isPresent(value: PaymentMethodDetail): boolean {
  return value !== null && value !== undefined;
}

export function isPaymentMethodTypeComplete(method: PaymentMethodTypeFields): boolean {
  switch (method.type) {
    case "card": {
      return (
        isPresent(method.cardBrand) &&
        isPresent(method.cardLast4) &&
        isPresent(method.cardExpiryMonth) &&
        isPresent(method.cardExpiryYear)
      );
    }
    case "upi": {
      return isPresent(method.upiId);
    }
    case "bank_account":
    case "imps":
    case "cheque": {
      return isPresent(method.bankAccountId);
    }
  }
}

export function assertPaymentMethodTypeFields(method: PaymentMethodTypeFields): void {
  if (!isPaymentMethodTypeComplete(method)) {
    throw new Error(PAYMENT_METHOD_TYPE_REQUIREMENTS_MESSAGE);
  }
}
