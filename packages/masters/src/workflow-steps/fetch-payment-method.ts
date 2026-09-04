import { masterPaymentMethod } from "#/db-schemas";
import type { MasterPaymentMethod } from "#/db-schemas/payment-method";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchPaymentMethodStep = defineFetchByIdStep<MasterPaymentMethod>({
  idColumn: masterPaymentMethod.id,
  label: "Payment method",
  stepName: "masters-fetch-payment-method",
  table: masterPaymentMethod,
});
